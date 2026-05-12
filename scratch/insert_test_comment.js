const mongoose = require('mongoose');
const uri = "mongodb+srv://emmanx25_db_user:MsMsEnQgLj0djmlL@cluster0.e1ju3xg.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri, { dbName: "mindfuel" });
    const Comment = mongoose.connection.db.collection('comments');
    const User = mongoose.connection.db.collection('users');
    const user = await User.findOne({}); // Get any user
    
    if (!user) {
      console.log("No user found to attribute comment to.");
      process.exit(1);
    }
    
    const postIdStr = "6a02e33ba54dcb0cac4ccdea";
    const newComment = {
      userId: user._id,
      postId: new mongoose.Types.ObjectId(postIdStr),
      content: "Test comment from Antigravity",
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      parentId: null
    };
    
    const result = await Comment.insertOne(newComment);
    console.log("Inserted test comment:", result.insertedId);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
