import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { connectToDB } from "@/utils/database";


const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: "process.env.GOOGLE_CLIENT_ID",
      clientSecret: "process.env.GOOGLE_CLIENT_SECRET",
    }),
  ],
  async session({ session }) {

  },
  async signIn({ profile }) {
    try {
      await connectToDB();
      // Check if the user already exists
      const userExists = await User.findOne({ email: profile.email });
      if (!userExists) {
        await User.create({
          email: profile.email,
          username: profile.name,
        });
      }
    } catch (error) {
      console.log("Error connecting to MongoDB", error);
      return false;
    }
  },
});

export { handler as GET, handler as POST };
