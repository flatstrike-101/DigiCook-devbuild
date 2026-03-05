import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Star, StarHalf } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import UserAvatar from "@/components/UserAvatar";

type Ingredient = { name: string; amount: string; unit?: string };
type FeedComment = {
  id: string;
  uid?: string;
  username?: string;
  text?: string;
  createdAt?: any;
};

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
  ratingCount?: number;
  ratingAverage?: number;
  ratingTotal?: number;
  weightedScore?: number;
  myRating?: number | null;
  commentCount?: number;
  recentComments?: FeedComment[];
};

type ProfileData = {
  uid: string;
  username: string;
  fullName: string;
  profileImageUrl?: string;
  showProfileStats: boolean;
};

type ProfileStats = {
  recipesCreated: number;
  publishedPosts: number;
  friendsCount: number;
  ratingsReceived: number;
};

const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const RATING_WEIGHT_MIN_VOTES = 5;
const DEFAULT_GLOBAL_AVERAGE = 4;

function formatPostTime(createdAt: any) {
  const date = createdAt?.toDate?.();
  if (!date) return "just now";
  return formatDistanceToNow(date, { addSuffix: true });
}

function formatCommentTime(createdAt: any) {
  const date = createdAt?.toDate?.() ?? (createdAt instanceof Date ? createdAt : null);
  if (!date) return "just now";
  return formatDistanceToNow(date, { addSuffix: true });
}

function normalizeRating(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  if (rounded < 1 || rounded > 5) return null;
  return rounded;
}

function summarizeRatings(scoreDocs: Array<{ score?: unknown }>, legacyLikeCount: number) {
  const ratings = scoreDocs
    .map((docData) => normalizeRating(docData.score))
    .filter((v): v is number => v !== null);

  if (ratings.length > 0) {
    const total = ratings.reduce((sum, rating) => sum + rating, 0);
    const count = ratings.length;
    return {
      count,
      total,
      average: total / count,
    };
  }

  if (legacyLikeCount > 0) {
    const count = legacyLikeCount;
    const total = legacyLikeCount * 4;
    return {
      count,
      total,
      average: total / count,
    };
  }

  return {
    count: 0,
    total: 0,
    average: 0,
  };
}

function computeGlobalAverage(posts: FeedPost[], fallback = DEFAULT_GLOBAL_AVERAGE) {
  const totals = posts.reduce(
    (acc, post) => {
      acc.count += post.ratingCount ?? 0;
      acc.total += post.ratingTotal ?? 0;
      return acc;
    },
    { total: 0, count: 0 }
  );

  if (totals.count <= 0) return fallback;
  return totals.total / totals.count;
}

function computeWeightedScore(
  ratingAverage: number,
  ratingCount: number,
  globalAverage: number,
  minVotes = RATING_WEIGHT_MIN_VOTES
) {
  if (ratingCount <= 0) return 0;
  return (ratingCount / (ratingCount + minVotes)) * ratingAverage + (minVotes / (ratingCount + minVotes)) * globalAverage;
}

function renderAverageStars(avg: number) {
  const rounded = Math.round(avg * 2) / 2;
  const fullStars = Math.floor(rounded);
  const hasHalf = rounded % 1 !== 0;
  const stars: JSX.Element[] = [];

  for (let i = 0; i < fullStars; i += 1) {
    stars.push(<Star key={`full-${i}`} className="rating-star-active h-3.5 w-3.5 fill-current" />);
  }
  if (hasHalf) {
    stars.push(<StarHalf key="half" className="rating-star-active h-3.5 w-3.5 fill-current" />);
  }
  return stars;
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
  const [ratingPostIds, setRatingPostIds] = useState<Set<string>>(new Set());
  const [commentingPostIds, setCommentingPostIds] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
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
          profileImageUrl: data.profileImageUrl || data.photoURL || "",
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
          const postsWithRatings = await Promise.all(
            userPosts.map(async (post) => {
              const ratingsColRef = collection(db, "friendFeed", post.id, "scores");
              const myRatingRef = doc(db, "friendFeed", post.id, "scores", currentUid);
              const legacyLikesColRef = collection(db, "friendFeed", post.id, "likes");
              const commentsColRef = collection(db, "friendFeed", post.id, "comments");
              const recentCommentsQ = query(commentsColRef, orderBy("createdAt", "desc"), limit(3));
              const [ratingsSnap, myRatingSnap, legacyLikesSnap, commentsCountSnap, recentCommentsSnap] = await Promise.all([
                getDocs(ratingsColRef),
                getDoc(myRatingRef),
                getCountFromServer(legacyLikesColRef),
                getCountFromServer(commentsColRef),
                getDocs(recentCommentsQ),
              ]);

              const summary = summarizeRatings(
                ratingsSnap.docs.map((snap) => snap.data() as any),
                legacyLikesSnap.data().count ?? 0
              );

              return {
                ...post,
                ratingCount: summary.count,
                ratingTotal: summary.total,
                ratingAverage: summary.average,
                myRating: normalizeRating((myRatingSnap.data() as any)?.score),
                commentCount: commentsCountSnap.data().count ?? 0,
                recentComments: recentCommentsSnap.docs.map((snap) => ({ id: snap.id, ...(snap.data() as any) })),
              };
            })
          );

          const globalAverage = computeGlobalAverage(postsWithRatings);
          setPosts(
            postsWithRatings.map((post) => ({
              ...post,
              weightedScore: computeWeightedScore(post.ratingAverage ?? 0, post.ratingCount ?? 0, globalAverage),
            }))
          );
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

          const ratingsCountPromise = Promise.all(
            allPublishedSnap.docs.map(async (publishedDoc) => {
              const scoresSnap = await getDocs(collection(db, "friendFeed", publishedDoc.id, "scores"));
              const validScores = scoresSnap.docs
                .map((snap) => normalizeRating((snap.data() as any)?.score))
                .filter((value): value is number => value !== null);

              if (validScores.length > 0) return validScores.length;

              const legacyLikes = await getCountFromServer(collection(db, "friendFeed", publishedDoc.id, "likes"));
              return legacyLikes.data().count ?? 0;
            })
          );

          const [recipesCreatedCount, ratingsPerPost] = await Promise.all([
            recipesCreatedCountPromise,
            ratingsCountPromise,
          ]);

          const ratingsReceived = ratingsPerPost.reduce((sum, n) => sum + n, 0);
          setStats({
            recipesCreated: recipesCreatedCount ?? publishedCount,
            publishedPosts: publishedCount,
            friendsCount: 0,
            ratingsReceived,
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

  const handleSetRating = async (postId: string, selectedRating: number) => {
    const u = auth.currentUser;
    if (!u) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to rate recipes.",
        variant: "destructive",
      });
      return;
    }

    if (ratingPostIds.has(postId)) return;

    const currentPost = posts.find((p) => p.id === postId);
    if (!currentPost) return;

    const previousRating = normalizeRating(currentPost.myRating ?? null);
    const nextRating = previousRating === selectedRating ? null : selectedRating;

    const currentCount = currentPost.ratingCount ?? 0;
    const currentTotal = currentPost.ratingTotal ?? (currentPost.ratingAverage ?? 0) * currentCount;

    let optimisticCount = currentCount;
    let optimisticTotal = currentTotal;
    if (previousRating !== null && nextRating === null) {
      optimisticCount = Math.max(0, currentCount - 1);
      optimisticTotal = Math.max(0, currentTotal - previousRating);
    } else if (previousRating === null && nextRating !== null) {
      optimisticCount = currentCount + 1;
      optimisticTotal = currentTotal + nextRating;
    } else if (previousRating !== null && nextRating !== null) {
      optimisticTotal = currentTotal - previousRating + nextRating;
    }
    const optimisticAverage = optimisticCount > 0 ? optimisticTotal / optimisticCount : 0;
    const globalAverage = computeGlobalAverage(posts);
    const optimisticWeighted = computeWeightedScore(optimisticAverage, optimisticCount, globalAverage);

    setRatingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              myRating: nextRating,
              ratingCount: optimisticCount,
              ratingTotal: optimisticTotal,
              ratingAverage: optimisticAverage,
              weightedScore: optimisticWeighted,
            }
          : p
      )
    );

    const scoreRef = doc(db, "friendFeed", postId, "scores", u.uid);
    const notifRef = doc(db, "notifications", `score_${postId}_${u.uid}`);

    try {
      if (nextRating === null) {
        await Promise.all([deleteDoc(scoreRef), deleteDoc(notifRef)]);
      } else {
        await setDoc(
          scoreRef,
          {
            uid: u.uid,
            score: nextRating,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        if (currentPost.authorUid && currentPost.authorUid !== u.uid) {
          await setDoc(notifRef, {
            recipientId: currentPost.authorUid,
            type: "score",
            scoreValue: nextRating,
            senderUid: u.uid,
            senderUsername: myUsername || auth.currentUser?.email || "Someone",
            postId,
            recipeTitle: currentPost.title || "your recipe",
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch {
      const rollbackAverage = currentCount > 0 ? currentTotal / currentCount : 0;
      const rollbackWeighted = computeWeightedScore(rollbackAverage, currentCount, globalAverage);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                myRating: previousRating,
                ratingCount: currentCount,
                ratingTotal: currentTotal,
                ratingAverage: rollbackAverage,
                weightedScore: rollbackWeighted,
              }
            : p
        )
      );
      toast({
        title: "Rating failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRatingPostIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const handleAddComment = async (postId: string) => {
    const u = auth.currentUser;
    if (!u) {
      toast({
        title: "Not signed in",
        description: "You must be signed in to comment.",
        variant: "destructive",
      });
      return;
    }

    const text = (commentDrafts[postId] || "").trim();
    if (!text) return;
    if (commentingPostIds.has(postId)) return;

    const optimisticComment: FeedComment = {
      id: `temp-${Date.now()}`,
      uid: u.uid,
      username: myUsername || auth.currentUser?.email || "You",
      text,
      createdAt: new Date(),
    };
    const previousPost = posts.find((p) => p.id === postId);

    setCommentingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              commentCount: (p.commentCount ?? 0) + 1,
              recentComments: [optimisticComment, ...(p.recentComments ?? [])].slice(0, 3),
            }
          : p
      )
    );

    try {
      await addDoc(collection(db, "friendFeed", postId, "comments"), {
        uid: u.uid,
        username: myUsername || auth.currentUser?.email || "Someone",
        text,
        createdAt: serverTimestamp(),
      });
      const commentsColRef = collection(db, "friendFeed", postId, "comments");
      const [commentsCountSnap, recentCommentsSnap] = await Promise.all([
        getCountFromServer(commentsColRef),
        getDocs(query(commentsColRef, orderBy("createdAt", "desc"), limit(3))),
      ]);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentCount: commentsCountSnap.data().count ?? p.commentCount ?? 0,
                recentComments: recentCommentsSnap.docs.map((snap) => ({ id: snap.id, ...(snap.data() as any) })),
              }
            : p
        )
      );
    } catch {
      setCommentDrafts((prev) => ({ ...prev, [postId]: text }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                commentCount: previousPost?.commentCount ?? p.commentCount ?? 0,
                recentComments: previousPost?.recentComments ?? p.recentComments ?? [],
              }
            : p
        )
      );
      toast({
        title: "Comment failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCommentingPostIds((prev) => {
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
              <div className="flex items-center gap-3">
                <UserAvatar
                  photoURL={profile.profileImageUrl}
                  username={profile.username}
                  fullName={profile.fullName}
                  className="h-14 w-14"
                  fallbackClassName="text-lg font-semibold"
                />
                <div>
                  <h1 className="font-serif text-4xl font-bold mb-2">{profile.fullName}</h1>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
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
                <p className="text-xs text-muted-foreground">Ratings Received</p>
                <p className="text-2xl font-semibold mt-1">{loadingStats || !stats ? "..." : stats.ratingsReceived}</p>
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
                    const ratingCount = p.ratingCount ?? 0;
                    const ratingAverage = p.ratingAverage ?? 0;
                    const myRating = normalizeRating(p.myRating ?? null);
                    const ratingPending = ratingPostIds.has(p.id);
                    const starAverage = ratingCount > 0 ? ratingAverage : 0;
                    const commentCount = p.commentCount ?? 0;
                    const recentComments = p.recentComments ?? [];
                    const draft = commentDrafts[p.id] ?? "";
                    const commenting = commentingPostIds.has(p.id);

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

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="flex items-center gap-0.5">{renderAverageStars(starAverage)}</div>
                            <span>({ratingCount})</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {RATING_VALUES.map((value) => {
                              const active = myRating === value;
                              return (
                                <Button
                                  key={value}
                                  type="button"
                                  variant="outline"
                                  className={`h-7 px-2 text-xs ${active ? "rating-button-active" : ""}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSetRating(p.id, value);
                                  }}
                                  disabled={ratingPending}
                                >
                                  <Star className={`h-3.5 w-3.5 ${active ? "fill-current" : ""}`} />
                                  <span className="ml-1">{value}</span>
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-4 border-t border-border pt-3">
                          <p className="text-sm font-semibold mb-2">Comments ({commentCount})</p>
                          {recentComments.length === 0 ? (
                            <p className="text-sm text-muted-foreground mb-2">No comments yet.</p>
                          ) : (
                            <div className="space-y-2 mb-2">
                              {recentComments.map((c) => (
                                <div key={c.id} className="text-sm">
                                  <span className="font-semibold">@{c.username || "unknown"}</span>{" "}
                                  <span className="text-muted-foreground text-xs">{formatCommentTime(c.createdAt)}</span>
                                  <p>{c.text}</p>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2">
                            <Input
                              value={draft}
                              placeholder="Write a comment..."
                              onChange={(e) =>
                                setCommentDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            />
                            <Button
                              type="button"
                              size="sm"
                              className={blueButtonClasses}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleAddComment(p.id);
                              }}
                              disabled={commenting || !draft.trim()}
                            >
                              {commenting ? "Posting..." : "Post"}
                            </Button>
                          </div>
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
                <p className="text-sm text-muted-foreground">No friends visible.</p>
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
