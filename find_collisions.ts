import mongoose from 'mongoose';
import User from './src/models/user';
import { connectToDB } from './src/utils/database';

async function run() {
    await connectToDB();
    const users = await User.find({}, 'name username firebaseId').lean();
    const handleMap: Record<string, string[]> = {};
    
    users.forEach(u => {
        const handle = u.username || u.name.replace(/\s+/g, "").toLowerCase().slice(0, 20);
        if (!handleMap[handle]) handleMap[handle] = [];
        handleMap[handle].push(u.name + " (" + u.firebaseId + ")");
    });
    
    console.log("Potential Handle Collisions:");
    for (const [handle, owners] of Object.entries(handleMap)) {
        if (owners.length > 1) {
            console.log(`@${handle}:`, owners.join(", "));
        }
    }
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
