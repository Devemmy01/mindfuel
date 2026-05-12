const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local" });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const db = mongoose.connection.db;
  const usersCollection = db.collection("users");
  
  const allUsers = await usersCollection.find({}).toArray();
  console.log(`Total users: ${allUsers.length}`);
  
  const targetUsers = await usersCollection.find({
    email: { $exists: true, $ne: "" },
    "preferences.notifications": { $ne: false }
  }).toArray();
  
  console.log(`Target users: ${targetUsers.length}`);
  console.log("Sample target user emails:");
  targetUsers.slice(0, 5).forEach(u => console.log(`- ${u.email} (name: ${u.name})`));
  
  process.exit(0);
}
check().catch(console.error);
