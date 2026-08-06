'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { StarDisplay, StarInput } from '@/app/components/StarRating'
import { Avatar } from '@/app/components/Avatar'
import { Heart, MessageCircle, CornerDownRight, Plus } from 'lucide-react'

type Review = {
  id: string
  rating: number | null
  review_title: string | null
  review_text: string | null
  status: string
  created_at: string
  user_id: string
  username: string
  avatar_url: string | null
  likeCount: number
  likedByMe: boolean
}

type Comment = {
  id: string
  user_destination_id: string
  user_id: string
  parent_comment_id: string | null
  comment_text: string
  created_at: string
  username: string
  avatar_url: string | null
}

type Destination = {
  city_name: string
  country_name: string
}

export default function CityDetailPage() {
  const params = useParams()
  const destinationId = params.id as string

  const [destination, setDestination] = useState<Destination | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [myProfile, setMyProfile] = useState<{ username: string; avatar_url: string | null } | null>(null)
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set())
  const [replyBoxOpen, setReplyBoxOpen] = useState<Record<string, boolean>>({})
  const [replyText, setReplyText] = useState<Record<string, string>>({})
  const [showWriteReview, setShowWriteReview] = useState(false)
  const [myReviewStatus, setMyReviewStatus] = useState('visited')
  const [myReviewRating, setMyReviewRating] = useState<number | null>(null)
  const [myReviewText, setMyReviewText] = useState('')
  const [myReviewTitle, setMyReviewTitle] = useState('')
  const [reviewError, setReviewError] = useState('')

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setCurrentUserId(session?.user.id || null)

    if (session) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .single()
      setMyProfile(profileData)
    }

    const { data: destData } = await supabase
      .from('destinations')
      .select('city_name, country_name')
      .eq('id', destinationId)
      .single()
    setDestination(destData)

    const { data: reviewRows } = await supabase
      .from('user_destinations')
      .select('id, rating, review_title, review_text, status, created_at, user_id, profiles(username, avatar_url)')
      .eq('destination_id', destinationId)
      .or('rating.not.is.null,review_text.not.is.null')
      .order('created_at', { ascending: false })

    const reviewIds = (reviewRows || []).map((r: any) => r.id)

    const { data: likeRows } = await supabase
      .from('review_likes')
      .select('user_destination_id, user_id')
      .in('user_destination_id', reviewIds.length > 0 ? reviewIds : ['00000000-0000-0000-0000-000000000000'])

    const builtReviews: Review[] = (reviewRows || []).map((r: any) => {
      const likesForThis = (likeRows || []).filter((l: any) => l.user_destination_id === r.id)
      return {
        id: r.id,
        rating: r.rating,
        review_title: r.review_title,
        review_text: r.review_text,
        status: r.status,
        created_at: r.created_at,
        user_id: r.user_id,
        username: r.profiles?.username || 'Unknown',
        avatar_url: r.profiles?.avatar_url || null,
        likeCount: likesForThis.length,
        likedByMe: session ? likesForThis.some((l: any) => l.user_id === session.user.id) : false,
      }
    })
    setReviews(builtReviews)

    if (reviewIds.length > 0) {
      const { data: commentRows } = await supabase
        .from('review_comments')
        .select('id, user_destination_id, user_id, parent_comment_id, comment_text, created_at, profiles(username, avatar_url)')
        .in('user_destination_id', reviewIds)
        .order('created_at', { ascending: true })

      const builtComments: Comment[] = (commentRows || []).map((c: any) => ({
        id: c.id,
        user_destination_id: c.user_destination_id,
        user_id: c.user_id,
        parent_comment_id: c.parent_comment_id,
        comment_text: c.comment_text,
        created_at: c.created_at,
        username: c.profiles?.username || 'Unknown',
        avatar_url: c.profiles?.avatar_url || null,
      }))
      setComments(builtComments)
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [destinationId])

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    setReviewError('')

    if (!currentUserId) return

    const { error } = await supabase.from('user_destinations').upsert(
      {
        user_id: currentUserId,
        destination_id: destinationId,
        status: myReviewStatus,
        rating: myReviewStatus !== 'want_to_go' ? myReviewRating : null,
        review_title: myReviewTitle || null,
        review_text: myReviewText || null,
      },
      { onConflict: 'user_id,destination_id' }
    )

    if (error) {
      setReviewError(error.message)
      return
    }

    setShowWriteReview(false)
    setMyReviewStatus('visited')
    setMyReviewRating(null)
    setMyReviewText('')
    load()
  }

  const handleToggleLike = async (review: Review) => {
    if (!currentUserId) return

    if (review.likedByMe) {
      await supabase
        .from('review_likes')
        .delete()
        .eq('user_destination_id', review.id)
        .eq('user_id', currentUserId)

      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, likedByMe: false, likeCount: r.likeCount - 1 } : r
        )
      )
    } else {
      await supabase.from('review_likes').insert({
        user_destination_id: review.id,
        user_id: currentUserId,
      })

      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, likedByMe: true, likeCount: r.likeCount + 1 } : r
        )
      )
    }
  }

  const toggleExpanded = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev)
      if (next.has(reviewId)) next.delete(reviewId)
      else next.add(reviewId)
      return next
    })
  }

  const toggleReplyBox = (key: string) => {
    setReplyBoxOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubmitComment = async (reviewId: string, parentCommentId: string | null, key: string) => {
    if (!currentUserId || !myProfile) return
    const text = (replyText[key] || '').trim()
    if (!text) return

    const { data: inserted, error } = await supabase
      .from('review_comments')
      .insert({
        user_destination_id: reviewId,
        user_id: currentUserId,
        parent_comment_id: parentCommentId,
        comment_text: text,
      })
      .select()
      .single()

    if (error || !inserted) return

    const newComment: Comment = {
      id: inserted.id,
      user_destination_id: reviewId,
      user_id: currentUserId,
      parent_comment_id: parentCommentId,
      comment_text: text,
      created_at: inserted.created_at,
      username: myProfile.username,
      avatar_url: myProfile.avatar_url,
    }

    setComments((prev) => [...prev, newComment])
    setReplyText((prev) => ({ ...prev, [key]: '' }))
    setReplyBoxOpen((prev) => ({ ...prev, [key]: false }))
    setExpandedReviews((prev) => new Set(prev).add(reviewId))
  }

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('review_comments').delete().eq('id', commentId)
    load()
  }

  const renderCommentTree = (
    reviewId: string,
    parentId: string | null,
    depth: number
  ) => {
    const children = comments.filter(
      (c) => c.user_destination_id === reviewId && c.parent_comment_id === parentId
    )

    if (children.length === 0) return null

    return (
      <div style={{ marginLeft: depth > 0 ? '1.4rem' : 0 }}>
        {children.map((c) => {
          const key = `comment:${c.id}`
          return (
            <div key={c.id} style={{ marginTop: '0.7rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Avatar url={c.avatar_url} username={c.username} size={24} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{c.username}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.85rem', margin: '0.2rem 0' }}>{c.comment_text}</p>
                  <div style={{ display: 'flex', gap: '0.9rem' }}>
                    {currentUserId && (
                      <button
                        onClick={() => toggleReplyBox(key)}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          padding: '0.1rem 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <CornerDownRight size={12} strokeWidth={2} />
                        Reply
                      </button>
                    )}
                    {currentUserId === c.user_id && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          padding: '0.1rem 0',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  {replyBoxOpen[key] && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <input
                        type="text"
                        value={replyText[key] || ''}
                        onChange={(e) => setReplyText((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Write a reply..."
                        style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem 0.7rem' }}
                      />
                      <button
                        onClick={() => handleSubmitComment(reviewId, c.id, key)}
                        style={{ fontSize: '0.78rem', padding: '0.5rem 0.8rem' }}
                      >
                        Post
                      </button>
                    </div>
                  )}

                  {renderCommentTree(reviewId, c.id, depth + 1)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Loading...
      </div>
    )
  }

  if (!destination) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        City not found.
      </div>
    )
  }

  const ratedReviews = reviews.filter((r) => r.rating !== null)
  const avgRating =
    ratedReviews.length > 0
      ? ratedReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / ratedReviews.length
      : null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <a href="/cities" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        &larr; Back to explore
      </a>

      <h1 style={{ fontSize: '1.7rem', marginTop: '0.8rem', marginBottom: '0.2rem' }}>
        {destination.city_name}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
        {destination.country_name}
      </p>

      {avgRating !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem' }}>
          <StarDisplay value={Math.round(avgRating)} size={18} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {avgRating.toFixed(1)}/5 &middot; {ratedReviews.length} rating{ratedReviews.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {currentUserId && (
        <button
          onClick={() => setShowWriteReview((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <Plus size={15} strokeWidth={2} />
          Write a review
        </button>
      )}

      {showWriteReview && (
        <form
          onSubmit={handleSubmitReview}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            background: 'var(--surface)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
            borderRadius: '16px',
            padding: '1.2rem',
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { value: 'visited', label: 'Visited' },
              { value: 'lived', label: 'Lived there' },
              { value: 'want_to_go', label: 'Want to go' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMyReviewStatus(opt.value)}
                style={{
                  flex: 1,
                  background: myReviewStatus === opt.value ? 'var(--accent)' : 'var(--bg)',
                  color: myReviewStatus === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  padding: '0.5rem 0.4rem',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {myReviewStatus !== 'want_to_go' && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                Rating
              </label>
              <StarInput value={myReviewRating} onChange={setMyReviewRating} />
            </div>
          )}

          <input
            type="text"
            value={myReviewTitle}
            onChange={(e) => setMyReviewTitle(e.target.value)}
            placeholder="Title (e.g. Best food city I've ever visited)"
          />

          <textarea
            value={myReviewText}
            onChange={(e) => setMyReviewText(e.target.value)}
            placeholder="Share your thoughts (optional)"
            rows={3}
            style={{ resize: 'vertical' }}
          />

          {reviewError && <p style={{ color: '#D1453B', fontSize: '0.82rem', margin: 0 }}>{reviewError}</p>}

          <button type="submit">Post review</button>
        </form>
      )}

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Reviews</h2>

      {reviews.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          No reviews yet. Be the first!
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reviews.map((review) => {
            const topLevelKey = `review:${review.id}`
            const isExpanded = expandedReviews.has(review.id)
            const commentCount = comments.filter((c) => c.user_destination_id === review.id).length

            return (
              <div
                key={review.id}
                style={{
                  background: 'var(--surface)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
                  borderRadius: '16px',
                  padding: '1.1rem 1.2rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
                  <Avatar url={review.avatar_url} username={review.username} size={32} />
                  <div>
                    <a
                      href={`/users/${review.username}`}
                      style={{ fontSize: '0.88rem', fontWeight: 600 }}
                    >
                      {review.username}
                    </a>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {review.rating && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <StarDisplay value={review.rating} size={14} />
                  </div>
                )}

                {review.review_title && (
                  <h3 style={{ fontSize: '0.98rem', margin: '0 0 0.3rem 0' }}>{review.review_title}</h3>
                )}

                {review.review_text && (
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.8rem' }}>{review.review_text}</p>
                )}

                <div style={{ display: 'flex', gap: '1.2rem' }}>
                  <button
                    onClick={() => handleToggleLike(review)}
                    disabled={!currentUserId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'transparent',
                      color: review.likedByMe ? '#F0455E' : 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      padding: 0,
                    }}
                  >
                    <Heart size={15} strokeWidth={2} fill={review.likedByMe ? '#F0455E' : 'none'} />
                    {review.likeCount > 0 ? review.likeCount : ''}
                  </button>

                  <button
                    onClick={() => toggleExpanded(review.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      background: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '0.8rem',
                      padding: 0,
                    }}
                  >
                    <MessageCircle size={15} strokeWidth={2} />
                    {commentCount > 0 ? commentCount : 'Comment'}
                  </button>
                </div>

                {isExpanded && (
                  <div style={{ marginTop: '0.9rem', borderTop: '1px solid var(--border)', paddingTop: '0.9rem' }}>
                    {currentUserId && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.6rem' }}>
                        <input
                          type="text"
                          value={replyText[topLevelKey] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [topLevelKey]: e.target.value }))
                          }
                          placeholder="Write a comment..."
                          style={{ flex: 1, fontSize: '0.85rem' }}
                        />
                        <button
                          onClick={() => handleSubmitComment(review.id, null, topLevelKey)}
                          style={{ fontSize: '0.82rem' }}
                        >
                          Post
                        </button>
                      </div>
                    )}
                    {renderCommentTree(review.id, null, 0)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
