// Type declarations for CSS modules
declare module "*.css" {
  const content: { [key: string]: string };
  export default content;
}
