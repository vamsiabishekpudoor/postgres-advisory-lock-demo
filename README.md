# 🐘 PostgreSQL Advisory Lock Demo in Node.js


This Node.js project demonstrates how to use **PostgreSQL Advisory Transaction Locks** (`pg_try_advisory_xact_lock`) to coordinate access between multiple processes. It shows how only one instance can acquire a lock at a time, making it useful for critical sections or singleton task execution in distributed environments.

---

## 📦 Features

- Uses PostgreSQL **advisory transaction-level locks**.
- Simulates **multiple concurrent processes** trying to acquire the same lock.
- Ensures **only one lock is acquired** while others fail gracefully.
- Built with **Node.js** and **`pg` (node-postgres)**.

---

## 🚀 How It Works

1. Connects to a PostgreSQL database using a connection pool.
2. Spawns 3 parallel simulated processes, each trying to acquire a transaction-level advisory lock.
3. Only **one** acquires the lock; others roll back.
4. Logs the result of each attempt.
5. The successful instance commits; others are cleaned up.

---

## 📁 Project Structure

```bash
.
├── index.js         # Main file to run the lock demonstration
├── .env             # Stores your DATABASE_URL
├── package.json     # Node.js project metadata and dependencies
└── README.md        # Project documentation

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/vamsiabishekpudoor/postgres-advisory-lock-demo.git
cd postgres-advisory-lock-demo

### 2. Install dependencies

```bash
npm install

### 3. Add environment variables
Create a .env file in the project root:

```bash
DATABASE_URL=postgresql://username:password@localhost:5432/your_database

## ▶️ Run the Demo

```bash
node index.js

## 📌 Sample Output

```bash
🔗 Connecting to database...
📍 Database URL: postgresql://user:****@localhost:5432/mydb
✅ Database connection successful!
🏁 Starting concurrent lock test with key: test-connections
🔐 Attempting to acquire lock for key: 123456789
✅ Lock acquired successfully for key: 123456789
❌ Failed to acquire lock for key: 123456789
❌ Failed to acquire lock for key: 123456789

🎯 Summary: 1 out of 3 instances acquired the lock


## 📚 What is `pg_try_advisory_xact_lock`?

PostgreSQL advisory locks are used for **application-level locking**.  
`pg_try_advisory_xact_lock(key)`:

- Tries to acquire a lock for the **duration of the current transaction**
- Returns immediately (`true` if acquired, `false` if not)
- Useful for **preventing concurrent execution** of the same task

Learn more: [PostgreSQL Docs → Advisory Locks](https://www.postgresql.org/docs/current/explicit-locking.html#ADVISORY-LOCKS)

## 🛠 License
MIT — feel free to use, modify, and share.

## 👨‍💻 Author
Built by Vamsi Abishek Pusoor

