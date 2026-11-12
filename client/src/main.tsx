import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Link, Outlet, Route, Routes, useNavigate, useParams } from "react-router";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient, trpc, trpcClient } from "./utils/trpc";

const Layout = () => (
  <div style={{ maxWidth: "800px" }}>
    <h1>
      <Link to="/">trpc-demo-link</Link>
    </h1>
    <Outlet />
  </div>
);

const Home = () => (
  <nav>
    <ul
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <li>
        <Link to="/create-organization">Create an organization</Link>
      </li>
      <li>
        <Link to="/o/_demo">Try the demo</Link>
      </li>
    </ul>
  </nav>
);

const Posts = (props: { slug: string }) => {
  const { data, refetch } = useQuery(
    trpc.listPosts.queryOptions({
      slug: props.slug,
    }),
  );
  if (!data) {
    return <></>;
  }
  return (
    <div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {data.map((p) => (
          <li
            key={p.id}
            style={{ padding: "5px 10px", border: "1px solid gray", borderRadius: "5px" }}
          >
            {p.text}
          </li>
        ))}
      </ul>
      <h3>New post</h3>
      <PostForm slug={props.slug} onSubmit={() => refetch()} />
    </div>
  );
};

const PostForm = (props: { slug: string; onSubmit: () => void }) => {
  const [text, setText] = useState("");
  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await trpcClient.createPost.mutate({
      slug: props.slug,
      text: text,
    });
    setText("");
    props.onSubmit();
  };
  return (
    <form
      id="post-form"
      onSubmit={onSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "10px" }}
    >
      <input
        id="text"
        type="text"
        name="text"
        required
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></input>
      <input type="submit" value="Submit" />
    </form>
  );
};

const OrgHome = () => {
  const params = useParams();
  const { data } = useQuery(
    trpc.getOrganization.queryOptions({
      slug: params.slug!,
    }),
  );
  if (!data) {
    return <></>;
  }
  return (
    <div>
      <h2>Welcome to {data.name}</h2>
      <h2>Posts</h2>
      <Posts slug={params.slug!} />
    </div>
  );
};

const CreateOrganization = () => {
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const onSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    await trpcClient.createOrganization.mutate({
      slug: slug,
      name: name,
    });
    navigate(`/o/${slug}`);
  };
  return (
    <div>
      <h2>Create an organization</h2>
      <form
        id="create-organization-form"
        onSubmit={onSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
      >
        <label htmlFor="slug">Slug</label>
        <input
          id="slug"
          type="text"
          name="slug"
          required
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        ></input>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        ></input>
        <input type="submit" value="Submit" />
      </form>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/create-organization" element={<CreateOrganization />} />
            <Route path="o">
              <Route path=":slug" element={<OrgHome />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
