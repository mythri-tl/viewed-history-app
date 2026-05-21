import { API_BASE_URL, resolveApiAssetUrl } from "../config";
import { useState, useEffect, useRef } from "react";

const PostCard = ({
  id,
  user_id,
  currentUser,
  author_name,
  author_image,
  content,
  image_url,
  hashtags,
  created_at,
  like_count: initialLikeCount = 0,
  comment_count: initialCommentCount = 0,
  inHistoryView = false,
  onDelete,
  minVisibilityPct = 50,
  minDurationSeconds = 3,
}) => {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const isLikingRef = useRef(false);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentContent, setEditingCommentContent] = useState("");
  const [commentActionError, setCommentActionError] = useState("");
  const [postActionError, setPostActionError] = useState("");
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [failedMediaUrl, setFailedMediaUrl] = useState("");

  // Image Loading State
  const [imageLoading, setImageLoading] = useState(true);

  // Edit Mode Local States
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [editHashtags, setEditHashtags] = useState(hashtags || "");
  const [editImageUrl, setEditImageUrl] = useState(image_url || "");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fileInputRef = useRef(null);

  // Sync state values with props when they are updated in real-time by parent WS
  const [prevProps, setPrevProps] = useState({
    content,
    hashtags,
    image_url,
    initialLikeCount,
    initialCommentCount,
  });

  if (
    content !== prevProps.content ||
    hashtags !== prevProps.hashtags ||
    image_url !== prevProps.image_url ||
    initialLikeCount !== prevProps.initialLikeCount ||
    initialCommentCount !== prevProps.initialCommentCount
  ) {
    setPrevProps({
      content,
      hashtags,
      image_url,
      initialLikeCount,
      initialCommentCount,
    });
    setLikeCount(initialLikeCount);
    setCommentCount(initialCommentCount);
    setEditContent(content);
    setEditHashtags(hashtags || "");
    setEditImageUrl(image_url || "");
    setImageLoading(true);
    setFailedMediaUrl("");
  }

  // Sync like event updates
  useEffect(() => {
    const handleLikeUpdate = (e) => {
      const { likeCount: updatedLikeCount } = e.detail;
      setLikeCount(updatedLikeCount);
    };
    window.addEventListener(`post-like-update-${id}`, handleLikeUpdate);
    return () =>
      window.removeEventListener(`post-like-update-${id}`, handleLikeUpdate);
  }, [id]);

  // Listen for comments in real-time and append them
  useEffect(() => {
    const handleNewComment = (e) => {
      const comment = e.detail;
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };
    window.addEventListener(`new-comment-${id}`, handleNewComment);
    return () =>
      window.removeEventListener(`new-comment-${id}`, handleNewComment);
  }, [id]);

  useEffect(() => {
    const handleCommentUpdate = (e) => {
      const comment = e.detail;
      setComments((prev) =>
        prev.map((c) => (c.id === comment.id ? { ...c, ...comment } : c)),
      );
    };
    const handleCommentDelete = (e) => {
      const { commentId } = e.detail;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      if (editingCommentId === commentId) {
        setEditingCommentId(null);
        setEditingCommentContent("");
      }
    };

    window.addEventListener(`comment-update-${id}`, handleCommentUpdate);
    window.addEventListener(`comment-delete-${id}`, handleCommentDelete);
    return () => {
      window.removeEventListener(`comment-update-${id}`, handleCommentUpdate);
      window.removeEventListener(`comment-delete-${id}`, handleCommentDelete);
    };
  }, [id, editingCommentId]);

  // Real-time post edit update listener
  useEffect(() => {
    const handlePostUpdate = (e) => {
      const updatedPost = e.detail;
      setEditContent(updatedPost.content);
      setEditHashtags(updatedPost.hashtags || "");
      setEditImageUrl(updatedPost.image_url || "");
    };
    window.addEventListener(`post-update-sync-${id}`, handlePostUpdate);
    return () =>
      window.removeEventListener(`post-update-sync-${id}`, handlePostUpdate);
  }, [id]);

  // Fallback for avatar
  const avatar =
    author_image ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(author_name || "User")}&background=0a66c2&color=fff`;

  // Real-time LinkedIn-style IntersectionObserver dwelling duration tracker
  useEffect(() => {
    if (inHistoryView || isEditing) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    let observer = null;
    let isVisible = false;
    let viewStartTime = null;
    let totalDwellTime = 0;
    const postElement = document.getElementById(`post-${id}`);

    if (!postElement) return;

    const handleDwellEnd = () => {
      if (viewStartTime) {
        const elapsed = Date.now() - viewStartTime;
        totalDwellTime += elapsed;
        viewStartTime = null;
      }

      const seconds = Math.floor(totalDwellTime / 1000);
      if (seconds > 0) {
        const completed = seconds >= minDurationSeconds;
        fetch(`${API_BASE_URL}/api/history/view`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            postId: id,
            duration_seconds: seconds,
            completed,
          }),
        })
          .then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.postId) {
              window.dispatchEvent(new CustomEvent("history-view-tracked", {
                detail: {
                  postId: data.postId || id,
                  duration_seconds: data.duration_seconds ?? seconds,
                  completed: data.completed ?? completed,
                  viewedAt: data.viewedAt || new Date().toISOString(),
                  historyItem: data.historyItem,
                },
              }));
            }
          })
          .catch((err) => console.error("Failed to mark viewed:", err));

        // Reset dwelling counter for next view
        totalDwellTime = 0;
      }
    };

    const visibilityThreshold =
      Math.min(100, Math.max(10, minVisibilityPct)) / 100;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            isVisible = true;
            viewStartTime = Date.now();
          } else {
            isVisible = false;
            handleDwellEnd();
          }
        });
      },
      {
        threshold: visibilityThreshold,
      },
    );

    observer.observe(postElement);

    return () => {
      if (observer) {
        observer.unobserve(postElement);
        observer.disconnect();
      }
      if (isVisible) {
        handleDwellEnd();
      }
    };
  }, [id, inHistoryView, isEditing, minVisibilityPct, minDurationSeconds]);

  const handleLike = async () => {
    if (isLikingRef.current) return;
    isLikingRef.current = true;
    setIsLiking(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/posts/${id}/like`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (response.ok) {
        setLikeCount(data.likeCount);
        if (data.action === "unliked" || data.message.includes("unliked")) {
          setIsLiked(false);
        } else if (data.action === "liked" || data.message.includes("liked")) {
          setIsLiked(true);
        }
      }
    } catch (error) {
      console.error("Failed to like post", error);
    } finally {
      isLikingRef.current = false;
      setIsLiking(false);
    }
  };

  const toggleComments = async () => {
    setShowComments(!showComments);
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE_URL}/api/posts/${id}/comments`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setComments(data.comments || []);
        }
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setLoadingComments(false);
      }
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/api/posts/${id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newComment }),
      });
      const data = await res.json();

      if (res.ok) {
        setComments((prev) =>
          prev.some((c) => c.id === data.comment.id)
            ? prev
            : [...prev, data.comment],
        );
        setNewComment("");
        setCommentCount((prev) => prev + 1);
      }
    } catch (err) {
      console.error("Failed to post comment", err);
    }
  };

  const handleStartEditComment = (comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
    setCommentActionError("");
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent("");
    setCommentActionError("");
  };

  const handleUpdateComment = async (commentId) => {
    if (!editingCommentContent.trim()) return;

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/api/posts/${id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: editingCommentContent }),
        },
      );
      const data = await res.json();

      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? data.comment : c)),
        );
        handleCancelEditComment();
      } else {
        setCommentActionError(data.message || "Failed to update comment");
      }
    } catch {
      setCommentActionError("Server connection failed.");
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `${API_BASE_URL}/api/posts/${id}/comments/${commentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        setCommentCount((prev) => Math.max(0, prev - 1));
        if (editingCommentId === commentId) handleCancelEditComment();
      } else {
        setCommentActionError(data.message || "Failed to delete comment");
      }
    } catch {
      setCommentActionError("Server connection failed.");
    }
  };
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setEditError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setEditError("Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImageUrl(reader.result);
      setEditError("");
    };
    reader.onerror = () => {
      setEditError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setEditImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeletePost = async () => {
    if (isDeletingPost) return;

    const shouldDelete = window.confirm(
      "Delete this post? This action cannot be undone.",
    );
    if (!shouldDelete) return;

    setIsDeletingPost(true);
    setPostActionError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        if (onDelete) onDelete(data.postId);
      } else {
        setPostActionError(data.message || "Failed to delete post");
      }
    } catch {
      setPostActionError("Server connection failed.");
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${id}`;
    navigator.clipboard
      .writeText(postUrl)
      .then(() => {
        alert("Link copied to clipboard!");
      })
      .catch((err) => console.error("Failed to copy link", err));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) {
      setEditError("Content cannot be empty.");
      return;
    }

    setSavingEdit(true);
    setEditError("");

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE_URL}/api/posts/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editContent,
          imageUrl: editImageUrl,
          hashtags: editHashtags,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsEditing(false);
      } else {
        setEditError(data.message || "Failed to update post");
      }
    } catch {
      setEditError("Server connection failed.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Format date loosely
  const dateStr = new Date(created_at).toLocaleDateString();
  const mediaUrl = resolveApiAssetUrl(image_url);
  const editPreviewUrl = resolveApiAssetUrl(editImageUrl);
  const mediaLoadFailed = failedMediaUrl === mediaUrl;

  // If in Edit Mode, render inline editor instead of regular card content
  if (isEditing) {
    return (
      <article
        id={`post-${id}`}
        className="post-card glass"
        style={{
          marginBottom: "24px",
          overflow: "hidden",
          padding: "20px",
          borderRadius: "var(--border-radius-md)",
          borderLeft: "4px solid var(--primary-blue)",
        }}
      >
        <div
          className="post-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <img src={avatar} alt={author_name} className="post-avatar" />
            <div className="post-author-info">
              <h3>Editing Post</h3>
              <p
                className="author-headline"
                style={{ color: "var(--primary-blue)", fontWeight: "600" }}
              >
                Modify your thoughts
              </p>
            </div>
          </div>
        </div>

        {editError && (
          <div
            style={{
              color: "var(--danger)",
              marginBottom: "12px",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <i className="fa-solid fa-circle-exclamation"></i> {editError}
          </div>
        )}

        <form
          onSubmit={handleEditSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            style={{ display: "none" }}
          />

          <textarea
            placeholder="Share your updated thoughts..."
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: "100%",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--border-radius-md)",
              padding: "12px",
              resize: "vertical",
              minHeight: "120px",
              outline: "none",
              background: "white",
              fontFamily: "inherit",
              fontSize: "0.95rem",
            }}
          />

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <i
              className="fa-solid fa-hashtag"
              style={{
                position: "absolute",
                left: "12px",
                color: "var(--text-muted)",
              }}
            ></i>
            <input
              type="text"
              placeholder="Hashtags (e.g. #Backend #Database)"
              value={editHashtags}
              onChange={(e) => setEditHashtags(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "var(--border-radius-sm)",
                border: "1px solid var(--border-color)",
                background: "white",
                outline: "none",
                fontSize: "0.9rem",
              }}
            />
          </div>

          {editImageUrl.trim() ? (
            <div
              style={{
                position: "relative",
                borderRadius: "var(--border-radius-md)",
                overflow: "hidden",
                border: "1px solid var(--border-color)",
                marginTop: "8px",
              }}
            >
              <img
                src={editPreviewUrl}
                alt="Post preview"
                style={{
                  width: "100%",
                  maxHeight: "240px",
                  objectFit: "cover",
                  display: "block",
                }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
              <div
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "10px",
                  display: "flex",
                  gap: "8px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current && fileInputRef.current.click()
                  }
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  <i className="fa-solid fa-camera"></i> Change Photo
                </button>
                <button
                  type="button"
                  onClick={handleClearImage}
                  style={{
                    background: "rgba(239, 68, 68, 0.8)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}
                >
                  <i className="fa-solid fa-trash"></i> Remove Photo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                fileInputRef.current && fileInputRef.current.click()
              }
              style={{
                padding: "12px",
                border: "1px dashed var(--border-color)",
                borderRadius: "var(--border-radius-md)",
                background: "rgba(0,0,0,0.02)",
                cursor: "pointer",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                fontSize: "0.85rem",
                fontWeight: "600",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "var(--primary-light)";
                e.currentTarget.style.color = "var(--primary-blue)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
            >
              <i
                className="fa-regular fa-image"
                style={{ fontSize: "1.1rem" }}
              ></i>{" "}
              Upload Device Photo
            </button>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "12px",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "16px",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditContent(content);
                setEditHashtags(hashtags || "");
                setEditImageUrl(image_url || "");
                setEditError("");
              }}
              style={{
                padding: "8px 18px",
                borderRadius: "20px",
                border: "none",
                background: "transparent",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.85rem",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit || !editContent.trim()}
              style={{
                padding: "8px 24px",
                borderRadius: "20px",
                border: "none",
                background: "var(--primary-blue)",
                color: "white",
                cursor:
                  savingEdit || !editContent.trim() ? "not-allowed" : "pointer",
                fontWeight: "600",
                opacity: savingEdit || !editContent.trim() ? 0.5 : 1,
                fontSize: "0.85rem",
                boxShadow: "0 2px 8px rgba(10, 102, 194, 0.25)",
              }}
            >
              {savingEdit ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </article>
    );
  }

  return (
    <article
      id={`post-${id}`}
      className="post-card glass"
      style={{
        marginBottom: "24px",
        overflow: "hidden",
        transition: "border-color 0.5s ease, transform 0.3s ease",
      }}
    >
      <div
        className="post-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <img src={avatar} alt={author_name} className="post-avatar" />
          <div className="post-author-info">
            <h3>{author_name}</h3>
            <p className="author-headline">Member</p>
            <span className="post-time">{dateStr}</span>
          </div>
        </div>
        {currentUser && currentUser.id === user_id && (
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "6px 12px",
                borderRadius: "20px",
                transition: "all 0.2s",
                alignSelf: "center",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "600",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(0,0,0,0.05)";
                e.currentTarget.style.color = "var(--primary-blue)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              title="Edit Post Content and Hashtags"
            >
              <i className="fa-solid fa-pen-to-square"></i> Edit
            </button>
            <button
              onClick={handleDeletePost}
              disabled={isDeletingPost}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                cursor: isDeletingPost ? "not-allowed" : "pointer",
                fontSize: "0.85rem",
                padding: "6px 12px",
                borderRadius: "20px",
                transition: "all 0.2s",
                alignSelf: "center",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "600",
                opacity: isDeletingPost ? 0.6 : 1,
              }}
              onMouseOver={(e) => {
                if (!isDeletingPost) {
                  e.currentTarget.style.background = "rgba(239,68,68,0.08)";
                  e.currentTarget.style.color = "var(--danger)";
                }
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }}
              title="Delete Post"
            >
              <i className="fa-solid fa-trash"></i>{" "}
              {isDeletingPost ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>

      {postActionError && (
        <div
          style={{
            color: "var(--danger)",
            marginTop: "12px",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <i className="fa-solid fa-circle-exclamation"></i> {postActionError}
        </div>
      )}

      <div className="post-content">
        <p style={{ whiteSpace: "pre-wrap" }}>{content}</p>
        {hashtags && (
          <p
            style={{
              color: "var(--primary-blue)",
              marginTop: "8px",
              fontWeight: "500",
            }}
          >
            {hashtags}
          </p>
        )}
      </div>

      {mediaUrl && (
        <div
          className="post-media"
          style={{
            marginTop: "16px",
            borderRadius: "var(--border-radius-md)",
            overflow: "hidden",
            border: "1px solid var(--border-color)",
            minHeight: imageLoading && !mediaLoadFailed ? "300px" : "auto",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f8fafc",
          }}
        >
          {imageLoading && !mediaLoadFailed && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <i
                className="fa-solid fa-spinner fa-spin"
                style={{ color: "var(--primary-blue)", fontSize: "24px" }}
              ></i>
            </div>
          )}
          {mediaLoadFailed ? (
            <div
              style={{
                minHeight: "180px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                color: "var(--text-muted)",
                background: "rgba(255,255,255,0.55)",
                fontSize: "0.9rem",
                fontWeight: "600",
                width: "100%",
              }}
            >
              <i className="fa-regular fa-image"></i> Image unavailable
            </div>
          ) : (
            <img
              src={mediaUrl}
              alt="Post media"
              style={{
                width: "100%",
                maxHeight: "400px",
                objectFit: "cover",
                display: "block",
                visibility: imageLoading ? "hidden" : "visible",
              }}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setFailedMediaUrl(mediaUrl);
              }}
            />
          )}
        </div>
      )}

      <div
        className="post-stats"
        style={{
          display: "flex",
          gap: "16px",
          marginTop: "16px",
          paddingBottom: "12px",
          borderBottom: "1px solid var(--border-color)",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
        }}
      >
        <span>
          <i
            className="fa-solid fa-thumbs-up"
            style={{ color: "var(--primary-blue)" }}
          ></i>{" "}
          {likeCount} Likes
        </span>
        <span>{commentCount} Comments</span>
      </div>

      <div
        className="post-actions"
        style={{
          display: "flex",
          justifyContent: "space-around",
          paddingTop: "12px",
          paddingBottom: "12px",
        }}
      >
        <button
          className={`action-btn ${isLiked ? "active" : ""}`}
          onClick={handleLike}
          disabled={isLiking}
          style={{
            background: "transparent",
            border: "none",
            padding: "8px 24px",
            borderRadius: "4px",
            cursor: isLiking ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: isLiked ? "var(--primary-blue)" : "var(--text-muted)",
            fontWeight: "600",
            transition: "all 0.2s",
            fontSize: "0.9rem",
            opacity: isLiking ? 0.6 : 1,
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
          }
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <i
            className={
              isLiked ? "fa-solid fa-thumbs-up" : "fa-regular fa-thumbs-up"
            }
          ></i>{" "}
          {isLiked ? "Liked" : "Like"}
        </button>
        <button
          className="action-btn"
          onClick={toggleComments}
          style={{
            background: showComments ? "rgba(0,0,0,0.03)" : "transparent",
            border: "none",
            padding: "8px 24px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-muted)",
            fontWeight: "600",
            fontSize: "0.9rem",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.05)")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.background = showComments
              ? "rgba(0,0,0,0.03)"
              : "transparent")
          }
        >
          <i className="fa-regular fa-comment"></i> Comment
        </button>
        <button
          className="action-btn"
          onClick={handleShare}
          style={{
            background: "transparent",
            border: "none",
            padding: "8px 24px",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-muted)",
            fontWeight: "600",
            fontSize: "0.9rem",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.background = "rgba(0,0,0,0.03)")
          }
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <i className="fa-solid fa-share-nodes"></i> Share
        </button>
      </div>

      {showComments && (
        <div
          className="comments-section"
          style={{
            padding: "16px",
            background: "rgba(255,255,255,0.4)",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <form
            onSubmit={handleCommentSubmit}
            style={{ display: "flex", gap: "12px", marginBottom: "20px" }}
          >
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={{
                flex: 1,
                padding: "10px 16px",
                borderRadius: "24px",
                border: "1px solid var(--border-color)",
                outline: "none",
                background: "white",
              }}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              style={{
                background: "var(--primary-blue)",
                color: "white",
                border: "none",
                borderRadius: "24px",
                padding: "8px 20px",
                cursor: newComment.trim() ? "pointer" : "not-allowed",
                opacity: newComment.trim() ? 1 : 0.6,
                fontWeight: "600",
              }}
            >
              Post
            </button>
          </form>

          {loadingComments ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                padding: "12px 0",
              }}
            >
              Loading comments...
            </div>
          ) : (
            <div
              className="comments-list"
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              {commentActionError && (
                <div style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
                  {commentActionError}
                </div>
              )}
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="comment-item"
                  style={{ display: "flex", gap: "12px" }}
                >
                  <img
                    src={
                      c.author_image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(c.author_name || "User")}&background=ccc&color=fff`
                    }
                    alt={c.author_name}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                    }}
                  />
                  <div
                    style={{
                      background: "white",
                      padding: "10px 14px",
                      borderRadius: "4px 16px 16px 16px",
                      border: "1px solid var(--border-color)",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "0.85rem",
                          color: "var(--text-main)",
                        }}
                      >
                        {c.author_name}
                      </div>
                      {currentUser && currentUser.id === c.user_id && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          {editingCommentId === c.id ? (
                            <button
                              type="button"
                              onClick={handleCancelEditComment}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                              }}
                            >
                              Cancel
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditComment(c)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--primary-blue)",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                              }}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(c.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "var(--danger)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    {editingCommentId === c.id ? (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="text"
                          value={editingCommentContent}
                          onChange={(e) =>
                            setEditingCommentContent(e.target.value)
                          }
                          style={{
                            flex: 1,
                            padding: "8px 10px",
                            borderRadius: "16px",
                            border: "1px solid var(--border-color)",
                            outline: "none",
                            fontSize: "0.85rem",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateComment(c.id)}
                          disabled={!editingCommentContent.trim()}
                          style={{
                            border: "none",
                            background: "var(--primary-blue)",
                            color: "white",
                            borderRadius: "16px",
                            padding: "6px 12px",
                            cursor: editingCommentContent.trim()
                              ? "pointer"
                              : "not-allowed",
                            opacity: editingCommentContent.trim() ? 1 : 0.6,
                            fontSize: "0.75rem",
                            fontWeight: "600",
                          }}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {c.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    padding: "8px 0",
                  }}
                >
                  No comments yet. Be the first!
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default PostCard;
