import app from "./src/app.js";
import connectDB from "./src/config/database.js";


connectDB();
app.listen(3000, () => {
    console.log(`Server is running on port http://localhost:3000`);
})

