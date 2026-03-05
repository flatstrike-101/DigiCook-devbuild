import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { formatDistanceToNow } from "date-fns";
import { auth, db } from "../../firebase";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Star, StarHalf, X } from "lucide-react";
import AddFriendModal from "@/components/AddFriendModal";
import UserAvatar from "@/components/UserAvatar";

type FriendDoc = {
  friendUid: string;
  friendUsername?: string;
  createdAt?: any;
};

type FriendDisplay = {
  uid: string;
  username: string;
  fullName: string;
};

type Ingredient = { name: string; amount: string; unit?: string };
type FeedComment = {
  id: string;
  uid?: string;
  username?: string;
  text?: string;
  createdAt?: any;
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

const blueButtonClasses =
  "bg-blue-950 !text-white !border-blue-950 hover:!bg-blue-900 hover:!border-blue-900 flex items-center gap-2 px-4 py-2 rounded-md";

const RATING_VALUES = [1, 2, 3, 4, 5] as const;
const RATING_WEIGHT_MIN_VOTES = 5;
const DEFAULT_GLOBAL_AVERAGE = 4;

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

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

export default function FriendActivity() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [userUid, setUserUid] = useState<string | null>(null);
  const [myUsername, setMyUsername] = useState<string>("");
  const [myFullName, setMyFullName] = useState<string>("You");
  const [myProfileImageUrl, setMyProfileImageUrl] = useState<string>("");

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [sending, setSending] = useState(false);

  const [friends, setFriends] = useState<FriendDisplay[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  const [confirmRemove, setConfirmRemove] = useState<FriendDisplay | null>(null);
  const [removing, setRemoving] = useState(false);

  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [ratingPostIds, setRatingPostIds] = useState<Set<string>>(new Set());
  const [commentingPostIds, setCommentingPostIds] = useState<Set<string>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUserUid(u?.uid ?? null);
      if (!u) setLocation("/login");
    });
    return () => unsub();
  }, [setLocation]);

  useEffect(() => {
    const loadMyUsername = async () => {
      const u = auth.currentUser;
      if (!u) return;

      try {
        const userSnap = await getDoc(doc(db, "users", u.uid));
        if (userSnap.exists()) {
          const data = userSnap.data() as any;
          setMyUsername(data.displayUsername || data.username || data.userName || u.email || "");
          setMyFullName(
            data.fullName || data.name || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "You"
          );
          setMyProfileImageUrl(data.profileImageUrl || data.photoURL || u.photoURL || "");
        } else {
          setMyUsername(u.email || "");
          setMyFullName("You");
          setMyProfileImageUrl(u.photoURL || "");
        }
      } catch {
        setMyUsername(u.email || "");
        setMyFullName("You");
        setMyProfileImageUrl(u.photoURL || "");
      }
    };

    if (userUid) loadMyUsername();
  }, [userUid]);

  const normalizeUsername = (raw: string) => raw.trim().replace(/^@/, "").toLowerCase();

  const loadFriends = async () => {
    const u = auth.currentUser;
    if (!u) return;

    setLoadingFriends(true);
    try {
      const friendsSnap = await getDocs(collection(db, "users", u.uid, "friends"));
      const base = friendsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Array<{ id: string } & FriendDoc>;

      const displays: FriendDisplay[] = [];

      for (const f of base) {
        const friendUid = f.friendUid || f.id;

        let username = (f.friendUsername || "").toString();
        let fullName = "";

        try {
          const profileSnap = await getDoc(doc(db, "users", friendUid));
          if (profileSnap.exists()) {
            const p = profileSnap.data() as any;
            fullName = p.fullName || p.name || `${p.firstName || ""} ${p.lastName || ""}`.trim();
            if (!username) username = p.displayUsername || p.username || p.userName || "";
          }
        } catch {}

        if (!username) username = friendUid;
        if (!fullName) fullName = "Unknown";

        displays.push({ uid: friendUid, username, fullName });
      }

      displays.sort((a, b) => a.username.localeCompare(b.username));
      setFriends(displays);
    } catch (err) {
      console.error("Error loading friends:", err);
      toast({
        title: "Error loading friends",
        description: "Something went wrong while loading your friends list.",
        variant: "destructive",
      });
    } finally {
      setLoadingFriends(false);
    }
  };

  const loadFeed = async () => {
    const u = auth.currentUser;
    if (!u) return;

    setLoadingFeed(true);
    try {
      const friendDocs = await getDocs(collection(db, "users", u.uid, "friends"));
      const friendUids = friendDocs.docs.map((d) => d.id);
      const visibleAuthors = Array.from(new Set([u.uid, ...friendUids]));

      const posts: FeedPost[] = [];
      const chunks = chunk(visibleAuthors, 10);

      for (const c of chunks) {
        const q = query(
          collection(db, "friendFeed"),
          where("authorUid", "in", c),
          orderBy("createdAt", "desc"),
          limit(50)
        );

        const snap = await getDocs(q);
        for (const d of snap.docs) posts.push({ id: d.id, ...(d.data() as any) });
      }

      posts.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });

      const postsWithRatings = await Promise.all(
        posts.map(async (post) => {
          const ratingsColRef = collection(db, "friendFeed", post.id, "scores");
          const myRatingRef = doc(db, "friendFeed", post.id, "scores", u.uid);
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
      setFeed(
        postsWithRatings.map((post) => ({
          ...post,
          weightedScore: computeWeightedScore(post.ratingAverage ?? 0, post.ratingCount ?? 0, globalAverage),
        }))
      );
    } catch (err) {
      console.error("Error loading feed:", err);
      toast({
        title: "Error loading feed",
        description: "Something went wrong while loading Friend Activity.",
        variant: "destructive",
      });
    } finally {
      setLoadingFeed(false);
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

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: FeedComment = {
      id: tempId,
      uid: u.uid,
      username: myUsername || auth.currentUser?.email || "You",
      text,
      createdAt: new Date(),
    };

    const previousPost = feed.find((p) => p.id === postId);

    setCommentingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setFeed((prev) =>
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
      setFeed((prev) =>
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
      setFeed((prev) =>
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

    const currentPost = feed.find((p) => p.id === postId);
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
    const globalAverage = computeGlobalAverage(feed);
    const optimisticWeighted = computeWeightedScore(optimisticAverage, optimisticCount, globalAverage);

    setRatingPostIds((prev) => {
      const next = new Set(prev);
      next.add(postId);
      return next;
    });

    setFeed((prev) =>
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
      setFeed((prev) =>
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

  useEffect(() => {
    if (userUid) {
      loadFriends();
      loadFeed();
    }
  }, [userUid]);

  const sendFriendRequest = async (rawUsername: string) => {
    const fromUid = auth.currentUser?.uid;
    if (!fromUid) return;

    const toUsername = normalizeUsername(rawUsername);

    if (!toUsername) {
      toast({
        title: "Username required",
        description: "Enter a username to send a request.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const usernameRef = doc(db, "usernames", toUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (!usernameSnap.exists()) {
        toast({
          title: "User not found",
          description: "No user with that username exists.",
          variant: "destructive",
        });
        return;
      }

      const data = usernameSnap.data() as any;
      const toUid = data.uid as string;

      if (!toUid) {
        toast({
          title: "Invalid user",
          description: "That username is not linked to a user.",
          variant: "destructive",
        });
        return;
      }

      if (toUid === fromUid) {
        toast({
          title: "Cannot add yourself",
          description: "Choose another username.",
          variant: "destructive",
        });
        return;
      }

      const requestId = `${fromUid}_${toUid}`;
      const requestRef = doc(db, "friendRequests", requestId);

      const { setDoc, serverTimestamp } = await import("firebase/firestore");

      await setDoc(requestRef, {
        fromUid,
        fromUsername: myUsername || auth.currentUser?.email || "",
        toUid,
        toUsername,
        status: "pending",
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Friend request sent",
        description: `Request sent to @${toUsername}.`,
      });
      setShowAddFriend(false);
    } catch (e: any) {
      toast({
        title: "Error",
        description: e?.message ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleRemoveFriend = async () => {
    const u = auth.currentUser;
    if (!u || !confirmRemove) return;

    setRemoving(true);
    try {
      await deleteDoc(doc(db, "users", u.uid, "friends", confirmRemove.uid));
      await deleteDoc(doc(db, "users", confirmRemove.uid, "friends", u.uid));

      setFriends((prev) => prev.filter((f) => f.uid !== confirmRemove.uid));
      setConfirmRemove(null);

      toast({
        title: "Friend removed",
        description: `Removed @${confirmRemove.username} from your friends.`,
      });

      await loadFeed();
    } catch (err) {
      console.error("Error removing friend:", err);
      toast({
        title: "Error removing friend",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
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
    } catch (err) {
      console.error("Error copying recipe:", err);
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

  return (
    <div className="min-h-screen">
      <div className="bg-muted/50 border-b py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-serif text-4xl font-bold mb-2">Friend Activity</h1>
              <p className="text-muted-foreground">Check out what your friends are cooking up.</p>
            </div>

            <Button
              onClick={() => setShowAddFriend(true)}
              className={blueButtonClasses}
              disabled={sending}
            >
              <PlusCircle className="h-4 w-4" />
              Add Friend
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <div className="rounded-xl border p-6">
              <h2 className="font-serif text-xl font-bold mb-4">Feed</h2>

              {loadingFeed ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : feed.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No posts yet. Publish a recipe to Friend Activity to get started.
                </p>
              ) : (
                <div className="space-y-3">
                  {feed.map((p) => {
                    const author = p.authorUsername || "unknown";
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
                          <p className="text-sm text-muted-foreground">
                            <span className="font-semibold">@{author}</span> posted a recipe - {postedAt}
                          </p>

                          <div className="flex items-center gap-2">
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
            <Card
              onClick={() => userUid && setLocation(`/profile/${userUid}`)}
              className="cursor-pointer p-4 hover:shadow-lg transition-shadow border border-border mb-6"
            >
              <div className="flex items-center gap-3">
                <UserAvatar
                  photoURL={myProfileImageUrl}
                  username={myUsername}
                  fullName={myFullName}
                  className="h-10 w-10"
                  fallbackClassName="text-sm font-semibold"
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Your Profile</p>
                  <p className="font-semibold truncate">{myFullName}</p>
                  <p className="text-sm text-muted-foreground truncate">@{myUsername || "you"}</p>
                </div>
              </div>
            </Card>

            <div className="flex items-center justify-between mb-4 mt-2">
              <h2 className="font-serif text-xl font-bold">Friends</h2>
              <p className="text-muted-foreground text-sm">{friendCountText}</p>
            </div>

            {loadingFriends ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : friends.length === 0 ? (
              <div className="rounded-xl border p-4">
                <p className="text-sm text-muted-foreground">No friends yet. Add one to get started.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((f) => (
                  <Card
                    key={f.uid}
                    onClick={() => setLocation(`/profile/${f.uid}`)}
                    className="cursor-pointer p-4 hover:shadow-lg transition-shadow border border-border"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{f.fullName}</p>
                        <p className="text-sm text-muted-foreground truncate">@{f.username}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground whitespace-nowrap px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmRemove(f);
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AddFriendModal
        show={showAddFriend}
        onClose={() => setShowAddFriend(false)}
        onSend={sendFriendRequest}
        loading={sending}
      />

      {confirmRemove && (
        <div className="fixed inset-0 z-[10001] bg-black/70 flex items-center justify-center">
          <div className="bg-background border border-border rounded-xl shadow-xl p-6 w-full max-w-md relative">
            <button
              type="button"
              onClick={() => setConfirmRemove(null)}
              className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-semibold mb-2">Remove Friend</h2>
            <p className="text-muted-foreground mb-6">
              Remove <span className="font-semibold">@{confirmRemove.username}</span> from your friends list?
            </p>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmRemove(null)} disabled={removing}>
                Cancel
              </Button>
              <Button className={blueButtonClasses} onClick={handleRemoveFriend} disabled={removing}>
                {removing ? "Removing..." : "Remove"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
