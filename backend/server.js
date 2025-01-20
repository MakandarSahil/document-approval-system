const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const errorHandler = require("./utils/errorHandler");

const userRoutes = require("./routes/user.routes");
const assistantRoutes = require("./routes/assistant.routes");
const app = express();
const corsOptions = {
    origin: ["http://localhost:5174", "http://localhost:5173"],
    credentials: true,
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

const connectDB = require("./db/connection");

connectDB(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connection successfull!");
    })
    .catch((error) => {
        console.log("server service :: connectDB :: error : ", error);
        console.log("MongoDB connection failed!!!!!");
    });

app.get("/", (req, res) => {
    console.log("new connection");
    res.send("welcome to document approval system");
});

app.use("/user", userRoutes);
app.use("/assistant", assistantRoutes);

app.use(errorHandler);
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
