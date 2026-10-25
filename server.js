const express = require("express");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let db;

async function startServer() {
    db = await mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "720778kavya",
        database: "mindspark"
    });

    console.log("MySQL connected!");

    app.get("/api/progress", async (req, res) => {
        try {
            const [students] = await db.query(
                "SELECT student_id FROM students ORDER BY student_id LIMIT 1"
            );

            let studentId;

            if (students.length === 0) {
                const [student] = await db.query(
                    "INSERT INTO students (student_name) VALUES (?)",
                    ["MindSpark Student"]
                );
                studentId = student.insertId;

                await db.query(
                    "INSERT INTO progress (student_id, points, activities_completed) VALUES (?, 0, 0)",
                    [studentId]
                );
            } else {
                studentId = students[0].student_id;
            }

            const [rows] = await db.query(
                "SELECT * FROM progress WHERE student_id = ?",
                [studentId]
            );

            if (rows.length === 0) {
                await db.query(
                    "INSERT INTO progress (student_id, points, activities_completed) VALUES (?, 0, 0)",
                    [studentId]
                );

                return res.json({
                    student_id: studentId,
                    points: 0,
                    activities_completed: 0
                });
            }

            res.json(rows[0]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Could not load progress" });
        }
    });

    app.post("/api/progress", async (req, res) => {
        try {
            const { points, activities_completed } = req.body;

            const [students] = await db.query(
                "SELECT student_id FROM students ORDER BY student_id LIMIT 1"
            );

            if (students.length === 0) {
                return res.status(400).json({
                    error: "Load progress first to create a student"
                });
            }

            const studentId = students[0].student_id;

            await db.query(
                `INSERT INTO progress
                (student_id, points, activities_completed)
                VALUES (?, ?, ?)
                ON DUPLICATE KEY UPDATE
                points = VALUES(points),
                activities_completed = VALUES(activities_completed)`,
                [
                    studentId,
                    Math.max(0, Number(points) || 0),
                    Math.max(0, Number(activities_completed) || 0)
                ]
            );

            res.json({ message: "Progress saved to MySQL!" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: "Could not save progress" });
        }
    });

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "index.html"));
    });

    app.listen(3000, () => {
        console.log("MindSpark running at http://localhost:3000");
    });
}

startServer().catch(error => {
    console.error("Server or MySQL connection failed:", error.message);
});