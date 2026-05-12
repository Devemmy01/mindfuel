const mongoose = require('mongoose');
const uri = 'mongodb+srv://emmanx25_db_user:MsMsEnQgLj0djmlL@cluster0.e1ju3xg.mongodb.net/?appName=Cluster0';

async function run() {
  try {
    await mongoose.connect(uri, { dbName: 'mindfuel' });
    const Comment = mongoose.connection.db.collection('comments');
    
    const result = await Comment.updateOne(
      { _id: new mongoose.Types.ObjectId('6a035341e12bbbdfec157e48') },
      { $set: { parentId: new mongoose.Types.ObjectId('6a034812e12bbbdfec157adf') } }
    );
    
    console.log('Update result:', result);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
