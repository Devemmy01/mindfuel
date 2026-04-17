import mongoose from 'mongoose';
import User from './src/models/user';
import { connectToDB } from './src/utils/database';

async function check(targetUsername: string, currentFirebaseId: string) {
    await connectToDB();
    console.log("Checking username:", targetUsername);
    console.log("Excluding firebaseId:", currentFirebaseId);
    
    const cleanUsername = targetUsername.replace(/\s+/g, "").toLowerCase().slice(0, 20);
    console.log("Cleaned username:", cleanUsername);
    
    // Check all users with this username
    const allMatches = await User.find({ username: cleanUsername }).lean();
    console.log("Total users with this username:", allMatches.length);
    allMatches.forEach(u => {
        console.log("- User:", u.name, "| firebaseId:", u.firebaseId, "| IS CURRENT:", u.firebaseId === currentFirebaseId);
    });
    
    const existingUser = await User.findOne({ username: cleanUsername, firebaseId: { $ne: currentFirebaseId } }).lean();
    console.log("Selection result (someone else):", existingUser ? "FOUND SOMEONE ELSE" : "FREE");
}

const username = process.argv[2];
const firebaseId = process.argv[3];

if (username && firebaseId) {
    check(username, firebaseId).then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
} else {
    console.log("Usage: node debug_username.ts <username> <firebaseId>");
}
