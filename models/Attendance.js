const mongoose = require("mongoose");
const AttendanceSchema = new mongoose.Schema({
    id:String,
    name: String,
    date: String, // YYYY-MM-DD format
    year:String,
});
module.exports = mongoose.model("Attendance", AttendanceSchema);