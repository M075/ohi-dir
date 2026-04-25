import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

const ReviewTab = ({ product }) => {
  const { data: session } = useSession();
  const [editReviewId, setEditReviewId] = useState(null);
  const [editReviewText, setEditReviewText] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!rating || !reviewText.trim()) {
      toast({
        title: "Error",
        description: "Please provide both rating and review text",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${product._id}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewer: session?.user?.name,
          rating,
          comment: reviewText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      setRating(0);
      setReviewText("");

      toast({
        title: "Success",
        description: "Review submitted successfully",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReview = async (reviewId) => {
    if (!editRating || !editReviewText.trim()) {
      toast({
        title: "Error",
        description: "Please provide both rating and review text",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch(`/api/products/${product._id}/reviews`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId,
          rating: editRating,
          comment: editReviewText.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update review");
      }

      setEditReviewId(null);
      setEditReviewText("");
      setEditRating(0);

      toast({
        title: "Success",
        description: "Review updated successfully",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      const res = await fetch(
        `/api/products/${product._id}/reviews?reviewId=${reviewId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete review");
      }

      toast({
        title: "Success",
        description: "Review deleted successfully",
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <TabsContent value="reviews" className="mt-6" data-oid="u2647ks">
      <div className="space-y-8" data-oid="-880yzf">
        {session?.user ? (
          <div
            className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-lg"
            data-oid="kx8n_jw"
          >
            <h4 className="text-lg font-semibold mb-4" data-oid="e4ptzc4">
              Write a Review
            </h4>
            <form
              onSubmit={handleReviewSubmit}
              className="space-y-4"
              data-oid="i6h9gyy"
            >
              <div data-oid="9w0.mtb">
                <label
                  className="block text-sm font-medium mb-1"
                  data-oid="i9wjyeh"
                >
                  Rating
                </label>
                <div className="flex gap-2" data-oid="spd67mv">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`text-2xl ${rating >= star ? "text-yellow-500" : "text-gray-300"}`}
                      onClick={() => setRating(star)}
                      data-oid="1dw8es6"
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div data-oid="7u3lu-.">
                <label
                  className="block text-sm font-medium mb-1"
                  data-oid="_8twizh"
                >
                  Your Review
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  required
                  className="w-full p-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-zinc-800"
                  placeholder="Share your experience with this product..."
                  rows={4}
                  data-oid="z:2p:bj"
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || !rating || !reviewText}
                  className="w-full sm:w-auto"
                  data-oid="bo9s_32"
                >
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <div
            className="text-center py-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg"
            data-oid="0qu15n."
          >
            <p className="mb-4" data-oid="-d0-.lu">
              Please log in to write a review
            </p>
            <Link
              href="/login"
              className="text-emerald-600 dark:text-emerald-500 hover:underline"
              data-oid="vobtqhw"
            >
              Login to Review
            </Link>
          </div>
        )}

        <div className="space-y-6" data-oid="v.ngc1s">
          <h3 className="text-lg font-semibold" data-oid="2g9:-rq">
            Customer Reviews ({product?.review?.length || 0})
          </h3>

          {product?.review?.length > 0 ? (
            product.review.map((review, index) => (
              <div
                key={index}
                className="border-b last:border-0 pb-4"
                data-oid="9pun1dp"
              >
                {editReviewId === review._id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleEditReview(review._id);
                    }}
                    data-oid="ry25wa2"
                  >
                    <div className="space-y-4" data-oid="us:x3_3">
                      <div data-oid="4g48v-e">
                        <label data-oid="zhrn3wx">Rating</label>
                        <div className="flex gap-2" data-oid="n02lgco">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setEditRating(star)}
                              className={`text-2xl ${editRating >= star ? "text-yellow-500" : "text-gray-300"}`}
                              data-oid=":fg7yws"
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        value={editReviewText}
                        onChange={(e) => setEditReviewText(e.target.value)}
                        className="w-full p-2 border rounded"
                        data-oid=":-j8se2"
                      />

                      <div className="flex gap-2" data-oid="xwkdnpe">
                        <Button type="submit" data-oid="v.i53bb">
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditReviewId(null);
                            setEditReviewText("");
                            setEditRating(0);
                          }}
                          data-oid="dl.:s5q"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <>
                    <div
                      className="flex items-center justify-between mb-2"
                      data-oid="8:9j71."
                    >
                      <div
                        className="flex items-center gap-x-2"
                        data-oid="-iwsbil"
                      >
                        <span className="font-medium" data-oid="pa._y._">
                          {review.reviewer}
                        </span>
                        <span className="text-yellow-500" data-oid="any60et">
                          {"★".repeat(review.rating)}
                        </span>
                      </div>
                      {session?.user?.name === review.reviewer && (
                        <div className="flex gap-2" data-oid="r9dd9md">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditReviewId(review._id);
                              setEditReviewText(review.comment);
                              setEditRating(review.rating);
                            }}
                            data-oid="4f9::h5"
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteReview(review._id)}
                            data-oid="1gs06nr"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                    <p
                      className="text-gray-700 dark:text-gray-300"
                      data-oid="00wbzkw"
                    >
                      {review.comment}
                    </p>
                  </>
                )}
              </div>
            ))
          ) : (
            <p className="text-center text-gray-500 py-4" data-oid="51cztf:">
              No reviews yet. Be the first to review this product!
            </p>
          )}
        </div>
      </div>
    </TabsContent>
  );
};

export default ReviewTab;
