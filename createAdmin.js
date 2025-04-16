const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/Admin"); 
require("dotenv").config();

mongoose.connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
}).then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const createAdmin = async () => {
    try {
        const username = "admin";
        const plainPassword = "123456";

        const hashedPassword = await bcrypt.hash(plainPassword, 10); 

        const admin = new Admin({ username, password: hashedPassword });

        await admin.save();
        console.log("✅ Admin created successfully!");
        
    } catch (error) {
        console.error("Error creating admin:", error);
    } finally {
        mongoose.connection.close();
    }
};

createAdmin();
