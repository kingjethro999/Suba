// suba-backend/middlewares/authMiddleware.js
import jwt from "jsonwebtoken";
import { dbPromise } from "../models/db.js"; // ✅ Import the promise version

export default async function authMiddleware(req, res, next) {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ Use promise-based query
      try {
        const [results] = await dbPromise.execute("SELECT * FROM users WHERE id = ?", [decoded.id]);
        
        if (results.length === 0) {
          return res.status(401).json({ message: "User no longer exists" });
        }

        req.user = results[0];
        next();
      } catch (dbError) {
        console.error('Database error in auth middleware:', dbError);
        return res.status(500).json({ message: "Database error" });
      }
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token invalid" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};