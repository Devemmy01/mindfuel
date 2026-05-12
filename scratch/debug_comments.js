const mongoose = require('mongoose');

const uri = "mongodb+srv://emmanx25_db_user:MsMsEnQgLj0djmlL@cluster0.e1ju3xg.mongodb.net/?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri, { dbName: "mindfuel" });
    console.log("Connected to DB (mindfuel)");
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Collections:", collections.map(c => c.name));
    
    const Comment = mongoose.connection.db.collection('comments');
    const lastComments = await Comment.find({}).sort({ createdAt: -1 }).limit(5).toArray();
    
    console.log("Last 5 comments:");
    lastComments.forEach(c => {
      console.log(`- ID: ${c._id}, PostID: ${c.postId}, Content: ${c.content.substring(0, 30)}`);
    });
    
    const specificPostId = "6a02e33ba54dcb0cac4ccdea";
    const count = await Comment.countDocuments({ 
      $or: [
        { postId: specificPostId },
        { postId: new mongoose.Types.ObjectId(specificPostId) }
      ]
    });
    console.log(`Comments for ${specificPostId}:`, count);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
