require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const Admin = require("./models/Admin"); 


const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const QRCode=require("qrcode");
const SECRET_KEY = process.env.SECRET_KEY;
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Models
const User = require("./models/User");
const Attendance = require("./models/Attendance");

// Real-time Updates
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("disconnect", () => console.log("User disconnected"));
});

// Admin Login
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");


// Add Names (Admin)
app.post("/add-user", async (req, res) => {
    const users = req.body; // Expecting an array of users
    try {
        await User.insertMany(users);
        res.json({ msg: "Users added successfully!" });
    } catch (error) {
        res.status(500).json({ error: "Error adding users" });
    }
});


// Mark Attendance
app.post("/mark-attendance", async (req, res) => {
    try {
        const { id, name } = req.body;
        if (!id || !name) {
            return res.status(400).json({ msg: "ID and Name are required" });
        }

        const today = new Date().toISOString().split("T")[0];

        // Validate user existence
        const user = await User.findOne({ id, name });
        if (!user) {
            return res.status(404).json({ msg: "User not found!" });
        }

        // Check if attendance is already marked
        const existingAttendance = await Attendance.findOne({ id, name, date: today });
        if (existingAttendance) {
            return res.status(409).json({ msg: "Attendance already marked" });
        }

        // Save attendance
        const attendance = new Attendance({ id, name, date: today });
        await attendance.save();

        // Emit real-time update
        io.emit("attendance-updated", { id, name, date: today });

        return res.status(201).json({ msg: "Attendance marked successfully" });
    } catch (error) {
        console.error("Error marking attendance:", error);
        return res.status(500).json({ msg: "Internal server error" });
    }
});

app.get("/alluser",async(req,res)=>{
    try{
        const allUsers = await User.find({});
        const allAttendance = await Attendance.find({});
        const data = allUsers.map((user)=>{
            const userAttendance = allAttendance
            .filter((record)=>record.id === user.id)
            .map((rec)=>rec.date);

            return {
                id: user.id,
                name: user.name,
                attendance: userAttendance,
              };
        });
        res.json(data);
    }catch(err){
        res.status(500).json({ error: "Failed to fetch data" });


    }
})
// Get Absentees
app.get("/absentees", async (req, res) => {
    const today = new Date().toISOString().split("T")[0];
    const allUsers = await User.find({});
    const presentUsers = await Attendance.find({ date: today });

    // Get absent users
    const absentees = allUsers
        .filter(user => !presentUsers.some(att => att.id === user.id))
        .map(user => ({ id: user.id, name: user.name }));  // Include name

    res.json(absentees);
});

// Generate today's QR code
app.get("/generate-qr", async (req, res) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
    const qrText = `https://attendfe-j1j4.vercel.app/attendance?code=${today}`; // Ensure this is backticks (`)

    console.log("Generated QR URL:", qrText); // Debugging log

    try {
        const qrImage = await QRCode.toDataURL(qrText);
        res.json({ qrCode: qrImage });
    } catch (error) {
        res.status(500).json({ error: "Error generating QR code" });
    }
});


app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const admin = await Admin.findOne({ username });

        if (!admin) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ username: admin.username }, SECRET_KEY, { expiresIn: "3h" });

        res.json({ token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));