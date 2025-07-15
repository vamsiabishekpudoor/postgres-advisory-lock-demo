const { Pool } = require("pg");
require("dotenv").config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.log(
    "Please add your PostgreSQL connection string to the .env file or environment variables"
  );
  process.exit(1);
}

console.log("🔗 Connecting to database...");
console.log("📍 Database URL:", DATABASE_URL.replace(/:[^:]*@/, ":****@"));

class PostgreSQLAdvisoryLock {
  constructor(client, lockKey, timeOut = 30000) {
    this.lockKey = this.hashLockKey(lockKey);
    this.timeOut = timeOut;
    this.client = client;
    this.hasLock = false;
  }

  hashLockKey(key) {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async acquireLock() {
    try {
      // Get a client from the pool if we don't have one
      if (!this.client) {
        throw new Error("No database client provided");
      }

      console.log(`🔐 Attempting to acquire lock for key: ${this.lockKey}`);

      // Start a transaction first
      await this.client.query("BEGIN");

      const result = await this.client.query(
        "SELECT pg_try_advisory_xact_lock($1) as acquired",
        [this.lockKey]
      );

      if (result.rows[0].acquired) {
        this.hasLock = result.rows[0].acquired;
        console.log(`✅ Lock acquired successfully for key: ${this.lockKey}`);
        return true;
      } else {
        // If we can't get the lock, rollback the transaction
        await this.client.query("ROLLBACK");
        console.log(`❌ Failed to acquire lock for key: ${this.lockKey}`);
        return false;
      }
    } catch (error) {
      // Rollback on error
      try {
        await this.client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error during rollback:", rollbackError);
      }
      console.error(`❌ Error acquiring lock for key ${this.lockKey}:`, error);
      throw error;
    }
  }

  async releaseLock() {
    if (!this.hasLock) {
      console.log(`⚠️  No lock to release for key: ${this.lockKey}`);
      return false;
    }
    console.log(`🔓 Releasing lock for key: ${this.lockKey}`);

    try {
      await this.client.query("COMMIT");
      console.log(`🔓 Lock released for key: ${this.lockKey}`);
      this.hasLock = false;
      return true;
    } catch (error) {
      try {
        await this.client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error during rollback:", rollbackError);
      }
      console.error("Error releasing lock:", error);
      return false;
    }
  }
}

async function testConcurrentLocks(pool) {
  const lockKey = "test-connections";
  console.log(`🏁 Starting concurrent lock test with key: ${lockKey}`);

  // Get separate clients for each instance
  const clients = await Promise.all([
    pool.connect(),
    pool.connect(),
    pool.connect(),
  ]);

  try {
    // Create lock instances with separate clients
    const lockInstances = clients.map((client, i) => {
      console.log(`📝 Creating lock instance ${i + 1}`);
      return new PostgreSQLAdvisoryLock(client, lockKey);
    });

    console.log("🏃 Starting race with separate connections...");

    const acquireResults = await Promise.all(
      lockInstances.map(async (lockInstance, index) => {
        try {
          const acquired = await lockInstance.acquireLock();
          console.log(
            `Instance ${index + 1}: ${acquired ? "SUCCESS" : "FAILED"}`
          );
          return { index, acquired, lockInstance };
        } catch (error) {
          console.error(`Instance ${index + 1} error:`, error);
          return { index, acquired: false, lockInstance };
        }
      })
    );

    console.log("\n📊 Results acquiring the lock:");
    const successCount = acquireResults.filter((r) => r.acquired).length;
    acquireResults.forEach(({ index, acquired }) => {
      console.log(
        `Instance ${index + 1}: ${acquired ? "🔐 ACQUIRED" : "❌ FAILED"}`
      );
    });

    console.log(
      `\n🎯 Summary: ${successCount} out of 3 instances acquired the lock`
    );

    // Clean up
    for (const { acquired, lockInstance } of acquireResults) {
      if (acquired) {
        await lockInstance.releaseLock();
      }
    }
  } finally {
    // Release all clients
    clients.forEach((client) => client.release());
    console.log("🔌 All separate clients released");
  }
}

async function main() {
  console.log("🚀 Starting PostgreSQL Lock Test in CodeSandbox");
  console.log("=".repeat(50));

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Test database connection
    console.log("📡 Testing database connection...");
    const client = await pool.connect();
    const result = await client.query("SELECT NOW(), version()");
    console.log("✅ Database connection successful!");
    console.log("📅 Database time:", result.rows[0].now);
    console.log("🐘 PostgreSQL version:", result.rows[0].version.split(" ")[0]);
    client.release();

    // Run lock tests
    await testConcurrentLocks(pool);

    console.log("\n🎉 Test completed successfully!");
  } catch (error) {
    console.error("❌ Error:", error);
    if (error.code === "ENOTFOUND") {
      console.log(
        "💡 Tip: Make sure your database URL is correct and accessible"
      );
    } else if (error.code === "ECONNREFUSED") {
      console.log(
        "💡 Tip: Check if your database server is running and accepts connections"
      );
    }
  } finally {
    await pool.end();
    console.log("🔌 Database connection closed");
  }
}

if (require.main === module) {
  main();
}
