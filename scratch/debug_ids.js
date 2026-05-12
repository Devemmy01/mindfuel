const mongoose = require('mongoose');
const uri = "mongodb+srv://emmanx25_db_user:MsMsEnQgLj0djmlL@cluster0.e1ju3xg.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri, { dbName: "mindfuel" });
    const postIdStr = "6a02e33ba54dcb0cac4ccdea";
    const Post = mongoose.connection.db.collection('posts');
    const post = await Post.findOne({ _id: new mongoose.Types.ObjectId(postIdStr) });
    
    if (post) {
      console.log("Post found:", post.text.substring(0, 50));
    } else {
      console.log("Post NOT found with ID:", postIdStr);
      // Try finding by text match to see if the ID is different
      const somePost = await Post.findOne({ text: /My thoughts are infinite/ });
      if (somePost) {
         console.log("Found post by text! Correct ID is:", somePost._id);
      }
    }
    
    const Comment = mongoose.connection.db.collection('comments');
    const allComments = await Comment.find({}).limit(20).toArray();
    console.log("Total comments in DB:", await Comment.countDocuments({}));
    console.log("Samples:");
    allComments.forEach(c => {
       console.log(`- PostID: ${c.postId} (Type: ${typeof c.postId})`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
