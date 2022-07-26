import { useState, useEffect, useRef } from "react";
import { BlogForm } from "./components/BlogForm";
import { Blog } from "./components/Blog";
import { Filter } from "./components/Filter";
import { LoginForm } from "./components/LoginForm";
import { Notification } from "./components/Notification";
import blogService from "./services/blogs";
import loginService from "./services/login";

const App = () => {
  const [blogs, setBlogs] = useState([]);
  const [newFilter, setNewFilter] = useState("");
  const [loginVisible, setLoginVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState({
    message: null,
    style: "",
  });

  useEffect(() => {
    blogService.getAll().then((initialPersons) => {
      setBlogs(initialPersons);
    });
  }, []);

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem("loggedBlogAppUser");
    if (loggedUserJSON) {
      const user = JSON.parse(loggedUserJSON);
      setUser(user);
      blogService.setToken(user.token);
    }
  }, []);

  const modifyPhoneNumber = (person, newNumber) => {
    const changedPerson = { ...person, number: newNumber };
    blogService
      .update(person.id, changedPerson)
      .then((returnedPerson) => {
        setBlogs(blogs.map((p) => (p.id !== person.id ? p : returnedPerson)));
      })
      .then(() => {
        setNotification({ message: "Number changed", style: "info" });
      })
      .then(() => {
        setTimeout(() => {
          setNotification({ message: null });
        }, 5000);
      })
      .catch((error) => {
        console.log(error);
        if (error.response.data.error.includes("Validation failed")) {
          setNotification({
            message: `${error.response.data.error}`,
            style: "error",
          });
        } else {
          setNotification({
            message: `Person '${person.name}' was already deleted from server`,
            style: "error",
          });
          setBlogs(blogs.filter((p) => p.id !== person.id));
        }
      })
      .then(() => {
        setTimeout(() => {
          setNotification({ message: null });
        }, 5000);
      });
  };

  const addBlog = async ({ newTitle, newAuthor, newUrl }) => {
    if (
      newTitle.length === 0 ||
      newAuthor.length === 0 ||
      newUrl.length === 0
    ) {
      setNotification({
        message: "Title, author or url missing",
        style: "error",
      });
      return false;
    }

    // TODO: MODIFICATION OF EXISTING BLOG
    // const existing = blogs.filter((blog) => blog.name === newTitle);
    // if (existing.length > 0) {
    //   if (window.confirm(`Replace ${newTitle} phone number?`)) {
    //     modifyPhoneNumber(existing[0], newAuthor);
    //     return;
    //     // TODO: What happens when user presses cancel?
    //   }
    // }

    const blogObject = {
      title: newTitle,
      author: newAuthor,
      url: newUrl,
    };

    try {
      const returnedBlog = await blogService.create(blogObject);
      setBlogs(blogs.concat(returnedBlog));
      showNotification({ message: "New blog added", style: "success" });
      return true;
    } catch (error) {
      if (error.response.data.error.includes("validation failed")) {
        showNotification({
          message: `${error.response.data.error}`,
          style: "error",
        });
      }
      return false;
    }
  };

  const showNotification = ({ message, style }) => {
    setNotification({
      message,
      style,
    });
    setTimeout(() => {
      setNotification({ message: null });
    }, 5000);
  };

  const blogsToShow =
    newFilter === ""
      ? blogs
      : blogs.filter((blog) =>
          blog.title.toLowerCase().includes(newFilter.toLowerCase())
        );

  /* TODO */
  const handleDeleteClick = ({ person }) => {
    if (window.confirm(`Delete ${person.name}`)) {
      blogService
        .deletePerson(person.id)
        .then((response) => {
          setBlogs(blogs.filter((p) => p.id !== person.id));
        })
        .then(() => {
          showNotification({
            message: "Person deleted",
            style: "info",
          });
        });
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (username.length === 0 || password.length === 0) {
      showNotification({
        message: "insert username and password",
        style: "error",
      });
      return;
    }

    try {
      const user = await loginService.login({
        username,
        password,
      });

      window.localStorage.setItem("loggedBlogAppUser", JSON.stringify(user));

      blogService.setToken(user.token);
      setUser(user);
      setUsername("");
      setPassword("");
      setLoginVisible(false);
      showNotification({
        message: `${user.username} logged in`,
        style: "success",
      });
    } catch (exception) {
      showNotification({
        message: "wrong username or password",
        style: "error",
      });
    }
  };

  const handleCancel = (event) => {
    event.preventDefault();
    setLoginVisible(false);
  };

  const loginForm = () => {
    if (loginVisible) {
      return (
        <LoginForm
          username={username}
          handleUsernameChange={(event) => setUsername(event.target.value)}
          password={password}
          handlePasswordChange={(event) => setPassword(event.target.value)}
          handleSubmit={handleLogin}
          handleCancel={handleCancel}
        />
      );
    } else {
      return <button onClick={() => setLoginVisible(true)}>login</button>;
    }
  };

  const blogForm = () => {
    return <BlogForm onSubmit={addBlog} />;
  };

  const loginInfo = () => {
    return (
      <p>
        {user.name} ({user.username}) logged in.{" "}
        <button
          onClick={() => {
            window.localStorage.removeItem("loggedBlogAppUser");
            blogService.setToken(null);
            setUser(null);
            showNotification({
              message: "Logged out.",
              style: "info",
            });
          }}
        >
          Logout
        </button>
      </p>
    );
  };

  const blogList = () => {
    return (
      <>
        <h2>Blogs</h2>
        <Filter
          value={newFilter}
          onChange={(event) => setNewFilter(event.target.value)}
        />
        <p>
          {newFilter.length === 0 ? (
            <></>
          ) : blogsToShow.length === 0 ? (
            <>No results</>
          ) : (
            <span>Filter in use</span>
          )}
        </p>
        <ul>
          {blogsToShow.map((blog) => (
            <li key={blog.id}>
              <Blog title={blog.title} author={blog.author} url={blog.url} />{" "}
              <button onClick={() => handleDeleteClick({ person: blog })}>
                delete
              </button>
            </li>
          ))}
        </ul>
      </>
    );
  };

  return (
    <div>
      <h1>Blogs</h1>
      <Notification message={notification.message} style={notification.style} />
      <div>
        {user === null && loginForm()}
        {user !== null && loginInfo()}
        {user !== null && blogForm()}
        {user !== null && blogList()}
      </div>
    </div>
  );
};

export default App;
