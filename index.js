const express = require("express");
const path = require("path");
const app = express();
const userController = require("./controllers/userController");
const postController = require("./controllers/postController");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const name = file.originalname;
    const testName = name.split("_");
    console.log("user", testName);
    cb(null, testName[0]);
  },
  filename: (req, file, cb) => {
    const name = file.originalname;
    const testName = name.split("_");
    console.log("user", testName);
    cb(null, testName[1]);
  },
});
const upload = multer({ storage: storage });
app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails")));
app.use("/avatar", express.static(path.join(__dirname, "avatar")));
app.use("/photo", express.static(path.join(__dirname, "photo")));
const port = 3000;
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("hello");
});
app.post("/register", userController.register);
app.post("/login", userController.login);
app.post("/add-service", userController.addService);
app.post("/get-user", userController.getUser);
app.post("/upload", upload.single("file"), userController.uploudFile);
app.post("/add-about", userController.addAbout);
app.get("/users", userController.users);
app.get("/search_users", userController.searchUsers);
app.post("/get_user", userController.getUserq);
app.post("/api/subscribe", userController.subscribe);
app.post("/add_client", userController.addClient);
app.post("/remove_client", userController.removeClient);
app.post("/api/unsubscribe", userController.unsubscribe);
app.post("/api/subscriptions", userController.subscriptions);
app.post("/api/users/batch", userController.butch);
app.post("/api/users/batch_events", userController.butchEvents);
app.post("/add_event", userController.addEvents);
app.post("/add_event", userController.addEat);
app.post(
  "/upload_to_post",
  upload.single("file"),
  postController.uploudFileToPost
);
app.post("/get_feeds", postController.getPosts);
app.post("/toggle_like", postController.toggleLike);
app.post("/change_user_name", userController.changeUserName);
app.post("/change_nik_name", userController.changeNikName);
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
