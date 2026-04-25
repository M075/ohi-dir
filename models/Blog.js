import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

let BlogSchema = models.Blog ? models.Blog.schema : null;

if (!BlogSchema) {
  BlogSchema = new Schema({
    title: String,
    slug: String,
  });
}

const Blog = models.Blog || model('Blog', BlogSchema);
export default Blog;