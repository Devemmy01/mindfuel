const mongoose = require('mongoose');
const uri = "mongodb+srv://emmanx25_db_user:MsMsEnQgLj0djmlL@cluster0.e1ju3xg.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri, { dbName: "mindfuel" });
    const Comment = mongoose.connection.db.collection('comments');
    const all = await Comment.find({}).limit(5).toArray();
    console.log("Found comments count:", all.length);
    all.forEach(c => {
      console.log(JSON.stringify(c, null, 2));
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
