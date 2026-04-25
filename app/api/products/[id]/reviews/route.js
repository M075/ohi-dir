import connectDB from "@/config/database";
import Product from "@/models/Product";
import { getSessionUser } from "@/utils/getSessionUser";
import mongoose from "mongoose";

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { userId } = await getSessionUser();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { id } = await params;
    const { reviewer, rating, comment } = await request.json();

    // Input validation
    if (!rating || !comment) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find and update product with new review
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      {
        $push: {
          review: {
            reviewer,
            rating: Number(rating),
            comment,
            date: new Date()
          }
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update average rating
    const avgRating = updatedProduct.review.reduce((acc, rev) => acc + rev.rating, 0) / updatedProduct.review.length;
    updatedProduct.rating = Number(avgRating.toFixed(1));
    await updatedProduct.save();

    return new Response(JSON.stringify(updatedProduct), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Review submission error:', error);
    return new Response(JSON.stringify({ 
      error: "Failed to submit review",
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add PUT method
// Add PUT method
export async function PUT(request, context) {
  try {
    await connectDB();
    const { params } = context;
    const { id } = params;
    const { reviewId, rating, comment } = await request.json();

    const product = await Product.findOneAndUpdate(
      { 
        _id: id,
        'review._id': reviewId 
      },
      { 
        $set: {
          'review.$.rating': Number(rating),
          'review.$.comment': comment,
          'review.$.date': new Date()
        }
      },
      { new: true }
    );

    if (!product) {
      return new Response(JSON.stringify({ error: "Review not found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Update average rating
    const avgRating = product.review.reduce((acc, rev) => acc + rev.rating, 0) / product.review.length;
    product.rating = Number(avgRating.toFixed(1));
    await product.save();
    
    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(request, context) {
  try {
    await connectDB();
    const { params } = context;
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const reviewId = searchParams.get('reviewId');

    const product = await Product.findByIdAndUpdate(
      id,
      { $pull: { review: { _id: reviewId } } },
      { new: true }
    );

    if (!product) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update average rating
    if (product.review.length > 0) {
      const avgRating = product.review.reduce((acc, rev) => acc + rev.rating, 0) / product.review.length;
      product.rating = Number(avgRating.toFixed(1));
    } else {
      product.rating = 0;
    }
    await product.save();

    return new Response(JSON.stringify(product), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}