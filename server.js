import app from "./src/app.js";
import connectDB from "./src/config/database.js";

const PORT = process.env.PORT || 5000;

connectDB();

const server = app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});

server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Set a different PORT in .env`);
    } else {
        console.error("Server error:", error.message);
    }
    process.exit(1);
});
