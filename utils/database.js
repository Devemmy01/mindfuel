import mongoose from "mongoose";

let isConnected = false; // Helps to check if the connection is already established

export const connectToDB = async () => {
  mongoose.set("strictQuery", true);

  if (isConnected) {
    console.log("MongoDB is already connected");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: "mindfuel",
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = true;
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.log("MongoDB connection failed", error);
  }
};
