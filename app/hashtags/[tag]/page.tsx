import HashtagFeedClient from "@/components/HashtagFeedClient";

export default async function HashtagPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag } = await params;

  return (
    <div className="flex flex-col w-full min-h-screen">
      <HashtagFeedClient tag={tag} />
    </div>
  );
}