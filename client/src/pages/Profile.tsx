import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, ThumbsUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { auth, db } from "../../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Ingredient = { name: string; amount: string; unit?: string };

type FriendDisplay = {
  uid: string;
  username: string;
  fullName: string;
};

type FeedPost = {
  id: string;
  authorUid?: string;
  authorUsername?: string;
  authorFullName?: string;
  recipeId?: string;
  title?: string;
  description?: string;
  ingredients?: Ingredient[];
  steps?: string[];
  createdAt?: any;
  likeCount?: number;
  likedByMe?: boolean;
};

type ProfileData = {
  uid: string;
  username: string;
  fullName: string;
  showProfileStats: boolean;
};

type ProfileStats = {
  recipesCreated: number;
  publishedPosts: number;
  friendsCount: number;
  likesReceived: number;
};

function formatPostTime(createdAt: any) {
  const date = createdAt?.toDate?.();
  if (!date) return "just now";
  return formatDistanceToNow(date, { addSuffix: true });
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/profile/:uid");
  const profileUid = params?.uid;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingStats, setLoadingStats] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [myUsername, setMyUsername] = useState("");
  const [likingPostIds, setLikingPostIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const blueButtonClasses =
    "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900 flex items-center gap-2 px-4 py-2 rounded-md";

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (!profileUid) {
      setLocation("/friends");
    }
  }, [profileUid, setLocation]);

  useEffect(() => {
    const loadMyUsername = async () => {
      const u = auth.currentUser;
      if (!u) return;

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setMyUsername(data.displayUsername || data.username || data.userName || u.email || "");
        } else {
          setMyUsername(u.email || "");
        }
      } catch {
        setMyUsername(u.email || "");
      }
    };

    loadMyUsername();
  }, []);

  useEffect(() => {
    if (!profileUid) return;

    const loadProfilePage = async () => {
      setLoading(true);
      setLoadingFriends(true);

      try {
        const profileSnap = await getDoc(doc(db, "users", profileUid));
        if (!profileSnap.exists()) {
          toast({
            title: "Profile not found",
            description: "This user profile does not exist.",
            variant: "destructive",
          });
          setLocation("/friends");
          return;
        }

        const data = profileSnap.data() as any;
        setProfile({
          uid: profileUid,
          username: data.displayUsername || data.username || data.userName || "unknown",
          fullName:
            data.fullName || data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Unknown",
          showProfileStats: data.showProfileStats !== false,
        });

        const postsQuery = query(
          collection(db, "friendFeed"),
          where("authorUid", "==", profileUid),
          orderBy("createdAt", "desc"),
          limit(50)
        );
        const postsSnap = await getDocs(postsQuery);
        const userPosts = postsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as FeedPost[];

        const currentUid = auth.currentUser?.uid;
        if (currentUid) {
          const postsWithLikes = await Promise.all(
            userPosts.map(async (post) => {
              const likesColRef = collection(db, "friendFeed", post.id, "likes");
              const myLikeRef = doc(db, "friendFeed", post.id, "likes", currentUid);
              const [countSnap, myLikeSnap] = await Promise.all([
                getCountFromServer(likesColRef),
                getDoc(myLikeRef),
              ]);
              return {
                ...post,
                likeCount: countSnap.data().count,
                likedByMe: myLikeSnap.exists(),
              };
            })
          );
          setPosts(postsWithLikes);
        } else {
          setPosts(userPosts);
        }

        if (data.showProfileStats !== false) {
          setLoadingStats(true);

          const viewingOwnProfile = auth.currentUser?.uid === profileUid;
          const allPublishedSnap = await getDocs(
            query(collection(db, "friendFeed"), where("authorUid", "==", profileUid))
          );

          const publishedCount = allPublishedSnap.size;
          const recipesCreatedCountPromise = viewingOwnProfile
            ? getDocs(query(collection(db, "recipes"), where("userId", "==", profileUid))).then((snap) => {
                const authored = snap.docs.filter((d) => {
                  const r = d.data() as any;
                  const copied = !!r.sourceRecipeId;
                  const authoredByOther = !!r.originalChefUid && r.originalChefUid !== profileUid;
                  return !copied && !authoredByOther;
                });
                return authored.length;
              })
            : Promise.resolve(null);
          const likesCountPromise = Promise.all(
            allPublishedSnap.docs.map(async (publishedDoc) => {
              const likesCount = await getCountFromServer(
                collection(db, "friendFeed", publishedDoc.id, "likes")
              );
              return likesCount.data().count;
            })
          );

          const [recipesCreatedCount, likesPerPost] = await Promise.all([
            recipesCreatedCountPromise,
            likesCountPromise,
          ]);

          const likesReceived = likesPerPost.reduce((sum, n) => sum + n, 0);
          setStats({
            recipesCreated: recipesCreatedCount ?? publishedCount,
            publishedPosts: publishedCount,
            friendsCount: 0, // updated after friends load
            likesReceived,
          });
        } else {
          setStats(null);
        }
      } catch (err) {
        console.error("Error loading profile page:", err);
        toast({
          title: "Error",
          description: "Could not load this profile page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingStats(false);
      }

      try {
        const friendsSnap = await getDocs(collection(db, "users", profileUid, "friends"));
        const base = friendsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Array<{ id: string; friendUid?: string; friendUsername?: string }>;

        const displays: FriendDisplay[] = [];
        for (const f of base) {
          const friendUid = f.friendUid || f.id;
          let username = f.friendUsername || "";
          let fullName = "Unknown";

          try {
            const friendProfileSnap = await getDoc(doc(db, "users", friendUid));
            if (friendProfileSnap.exists()) {
              const p = friendProfileSnap.data() as any;
              fullName =
                p.fullName || p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Unknown";
              if (!username) username = p.displayUsername || p.username || p.userName || friendUid;
            }
          } catch {}

          if (!username) username = friendUid;
          displays.push({ uid: friendUid, username, fullName });
        }

        displays.sort((a, b) => a.username.localeCompare(b.username));
        setFriends(displays);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                friendsCount: displays.length,
              }
            : prev
        );
      } catch (err) {
        console.error("Error loading profile friends:", err);
        setFriends([]);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadProfilePage();
  }, [profileUid, setLocation, toast]);

  const handleToggleLike = async (postId: string) => {
    const u = auth.currentUser;
    if (!u) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to like recipes.",
        variant: "destructive",
      });
      return;
    }

    if (likingPostIds.has(postId)) return;

    const currentPost = posts.find((p) => p.id === postId);
    const currentlyLiked = !!currentPost?.likedByMe;

    setLikingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              likedByMe: !currentlyLiked,
              likeCount: Math.max(0, (p.likeCount ?? 0) + (currentlyLiked ? -1 : 1)),
            }
          : p
      )
    );

    const likeRef = doc(db, "friendFeed", postId, "likes", u.uid);

    try {
      if (currentlyLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, {
          uid: u.uid,
          createdAt: serverTimestamp(),
        });

        if (currentPost?.authorUid && currentPost.authorUid !== u.uid) {
          const notifRef = doc(db, "notifications", `like_${postId}_${u.uid}`);
          await setDoc(notifRef, {
            recipientId: currentPost.authorUid,
            type: "like",
            senderUid: u.uid,
            senderUsername: myUsername || auth.currentUser?.email || "Someone",
            postId,
            recipeTitle: currentPost.title || "your recipe",
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                likedByMe: currentlyLiked,
                likeCount: Math.max(0, (p.likeCount ?? 0) + (currentlyLiked ? 1 : -1)),
              }
            : p
        )
      );
      toast({
        title: "Like failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLikingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleCopyToMyRecipes = async (post: FeedPost) => {
    const u = auth.currentUser;
    if (!u) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to copy recipes.",
        variant: "destructive",
      });
      return;
    }

    const sourceRecipeId = post.recipeId;
    if (!sourceRecipeId) {
      toast({
        title: "Cannot copy",
        description: "This post is missing a recipe id.",
        variant: "destructive",
      });
      return;
    }

    if (post.authorUid && post.authorUid === u.uid) {
      toast({
        title: "Already yours",
        description: "You can't copy your own recipe.",
        variant: "destructive",
      });
      return;
    }

    setCopyingId(post.id);
    try {
      const dupQuery = query(
        collection(db, "recipes"),
        where("userId", "==", u.uid),
        where("sourceRecipeId", "==", sourceRecipeId)
      );
      const dupSnap = await getDocs(dupQuery);
      if (!dupSnap.empty) {
        toast({
          title: "Already in My Recipes",
          description: "You already copied this recipe.",
          variant: "destructive",
        });
        return;
      }

      const title = post.title || "Untitled recipe";
      const description = post.description || "";
      const ingredients = post.ingredients || [];
      const steps = post.steps || [];

      await addDoc(collection(db, "recipes"), {
        userId: u.uid,
        title,
        description,
        ingredients,
        steps,
        createdAt: serverTimestamp(),
        originalChefName: post.authorFullName || post.authorUsername || "Unknown",
        originalChefUid: post.authorUid || null,
        sourceRecipeId,
      });

      toast({
        title: "Copied",
        description: "Recipe added to My Recipes.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCopyingId(null);
    }
  };

  const friendCountText = useMemo(() => {
    const n = friends.length;
    return `${n} ${n === 1 ? "friend" : "friends"}`;
  }, [friends.length]);

  if (!profileUid) return null;

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button variant="ghost" onClick={() => setLocation("/friends")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Friend Activity
          </Button>

          {loading || !profile ? (
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">Profile</h1>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">{profile.fullName}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!loading && profile ? (
          profile.showProfileStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Card className="p-4 border border-border">
                <p className="text-xs text-muted-foreground">Recipes Created</p>
                <p className="text-2xl font-semibold mt-1">{loadingStats || !stats ? "..." : stats.recipesCreated}</p>
              </Card>
              <Card className="p-4 border border-border">
                <p className="text-xs text-muted-foreground">Published Posts</p>
                <p className="text-2xl font-semibold mt-1">{loadingStats || !stats ? "..." : stats.publishedPosts}</p>
              </Card>
              <Card className="p-4 border border-border">
                <p className="text-xs text-muted-foreground">Likes Received</p>
                <p className="text-2xl font-semibold mt-1">{loadingStats || !stats ? "..." : stats.likesReceived}</p>
              </Card>
              <Card className="p-4 border border-border">
                <p className="text-xs text-muted-foreground">Friends</p>
                <p className="text-2xl font-semibold mt-1">{loadingStats || !stats ? "..." : stats.friendsCount}</p>
              </Card>
            </div>
          ) : (
            <Card className="p-4 border border-border mb-8">
              <p className="text-sm text-muted-foreground">This user has chosen to keep account stats private.</p>
            </Card>
          )
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="rounded-xl border p-6">
              <h2 className="font-serif text-xl font-bold mb-4">Published Recipes</h2>

              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : posts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No published recipes yet.</p>
              ) : (
                <div className="space-y-3">
                  {posts.map((p) => {
                    const title = p.title || "Untitled recipe";
                    const desc = p.description || "";
                    const ingredients = (p.ingredients || []) as Ingredient[];
                    const steps = (p.steps || []) as string[];
                    const postedAt = formatPostTime(p.createdAt);
                    const likeCount = p.likeCount ?? 0;
                    const likedByMe = !!p.likedByMe;
                    const liking = likingPostIds.has(p.id);

                    return (
                      <Card key={p.id} className="p-4 border border-border">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="text-sm text-muted-foreground">Published {postedAt}</p>
                          <Button
                            className={blueButtonClasses}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCopyToMyRecipes(p);
                            }}
                            disabled={copyingId === p.id}
                          >
                            {copyingId === p.id ? "Copying..." : "Copy"}
                          </Button>
                        </div>

                        <p className="font-serif text-2xl font-semibold mb-1">{title}</p>
                        {desc ? <p className="text-muted-foreground mb-4">{desc}</p> : null}

                        <div className="mb-4">
                          <h3 className="font-semibold mb-2">Ingredients</h3>
                          {ingredients.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No ingredients.</p>
                          ) : (
                            <ul className="list-disc list-inside space-y-1">
                              {ingredients.map((ing, i) => (
                                <li key={i}>
                                  {ing.amount} {ing.unit} {ing.name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold mb-2">Steps</h3>
                          {steps.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No steps.</p>
                          ) : (
                            <ol className="list-decimal list-inside space-y-1">
                              {steps.map((s, i) => (
                                <li key={i}>{s}</li>
                              ))}
                            </ol>
                          )}
                        </div>

                        <div className="mt-4 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleToggleLike(p.id);
                            }}
                            disabled={liking}
                          >
                            <ThumbsUp className={`h-4 w-4 ${likedByMe ? "fill-current text-blue-500" : ""}`} />
                            <span className="ml-1 text-sm tabular-nums">{likeCount}</span>
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-bold">Friends</h2>
              <p className="text-muted-foreground text-sm">{friendCountText}</p>
            </div>

            {loadingFriends ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">
                  No friends visible.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((f) => (
                  <Card
                    key={f.uid}
                    onClick={() => setLocation(`/profile/${f.uid}`)}
                    className="cursor-pointer p-4 hover:shadow-lg transition-shadow border border-border"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{f.fullName}</p>
                      <p className="text-sm text-muted-foreground truncate">@{f.username}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
