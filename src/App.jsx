import { Navigate, Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';

import Home from './pages/Home.jsx';
import Post from './pages/Post.jsx';
import Listing from './pages/Listing.jsx';
import Search from './pages/Search.jsx';
import Info from './pages/Info.jsx';
import NotFound from './pages/NotFound.jsx';

import Login from './admin/Login.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Posts from './admin/Posts.jsx';
import PostForm from './admin/PostForm.jsx';
import Comments from './admin/Comments.jsx';
import Categories from './admin/Categories.jsx';
import Settings from './admin/Settings.jsx';

export default function App() {
  return (
    <Routes>
      {/* ==================== PUBLIC ==================== */}
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />

        {/* Blog (both /blog and /latest point to the same listing) */}
        <Route path="blog" element={<Listing mode="latest" />} />
        <Route path="latest" element={<Listing mode="latest" />} />

        {/* Trending */}
        <Route path="trending" element={<Listing mode="trending" />} />

        {/* Category & Tag listings */}
        <Route path="category/:slug" element={<Listing mode="category" />} />
        <Route path="tag/:slug" element={<Listing mode="tag" />} />

        {/* Search */}
        <Route path="search" element={<Search />} />

        {/* Full post page */}
        <Route path="project/:slug" element={<Post />} />

        {/* Info pages */}
        <Route path="about" element={<Info page="about" />} />
        <Route path="contact" element={<Info page="contact" />} />
        <Route path="privacy-policy" element={<Info page="privacy-policy" />} />
        <Route path="terms" element={<Info page="terms" />} />
        <Route path="disclaimer" element={<Info page="disclaimer" />} />
        <Route path="cookie-policy" element={<Info page="cookie-policy" />} />

        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* ==================== ADMIN ==================== */}
      <Route path="/admin/login" element={<Login />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="posts" element={<Posts />} />
        <Route path="posts/create" element={<PostForm />} />
        <Route path="posts/edit/:id" element={<PostForm />} />
        <Route path="comments" element={<Comments />} />
        <Route path="categories" element={<Categories />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}