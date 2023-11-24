const express = require("express");
const path = require("path");
const app = express();
const ffmpeg = require("fluent-ffmpeg");
const userController = require("./controllers/userController");
const postController = require("./controllers/postController");
const dialogController = require("./controllers/dialogController");
const trainingController = require("./controllers/trainingController");
const shopController = require("./controllers/shopController");
const cors = require("cors");
const multer = require("multer");
const http = require("http");
const socketIo = require("socket.io");

const server = http.createServer(app);
const io = socketIo(server);
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
app.use(cors());
app.use("/thumbnails", express.static(path.join(__dirname, "thumbnails")));
app.use("/avatar", express.static(path.join(__dirname, "avatar")));
app.use("/photo", express.static(path.join(__dirname, "photo")));
app.use("/shopImg", express.static(path.join(__dirname, "shopImg")));
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
app.post("/add_eat", userController.addEat);
app.post(
  "/upload_to_post",
  upload.single("file"),
  postController.uploudFileToPost
);
app.post("/get_feeds", postController.getPosts);
app.post("/get_storys", postController.getStorys);
app.post("/toggle_like", postController.toggleLike);
app.post("/change_user_name", userController.changeUserName);
app.post("/change_nik_name", userController.changeNikName);
app.post("/update_service", userController.updateService);
app.post("/create_dialog", dialogController.createDialog);
app.post("/find_dialogs", dialogController.findDialogs);
app.post(
  "/find_dialogs_participiant",
  dialogController.findDialogsByParticipiant
);
app.post("/findDialogById", dialogController.findDialogById);
app.post("/send_message", dialogController.saveMessage);
app.post("/send_new", dialogController.setNew);
app.post("/get_training", postController.getTraining);
app.post("/create_training", trainingController.createTraining);
app.post(
  "/get_training_from_user_id",
  trainingController.getTrainingsFromUserId
);
app.post("/get_food_from_user_id", trainingController.getFoodFromUserId);
app.post("/edit_trainings", trainingController.editTrainings);
app.post("/del_trainings", trainingController.trainingsDel);
app.post("/add_active_events", userController.addActiveEvents);
app.post("/del_active_events", userController.removeActiveEvent);
app.post("/add_items_to_shop", shopController.addItemToShop);
app.post("/getItemsFromShop", shopController.getAllItemsFromShop);
app.post("/find_nearest", userController.findNearest);
app.post("/get_users_from_place", userController.getUserFromPlace);
app.post("/search_shop", shopController.searchShop);
app.post("/generate_post", userController.generatePost);
app.post("/generate_image", userController.genImage);
app.get("/convert", (req, res) => {
  const inputPath = path.join(__dirname, "1698739988758.mp4"); // Название входного файла
  const outputPath = path.join(__dirname, "output_video.mp4"); // Название выходного файла

  ffmpeg(inputPath)
    .videoCodec("libx265") // используем кодек x264 для сжатия видео
    .addOption("-preset", "superfast") // быстрый пресет
    .addOption("-crf", "23") // CRF: значение 23 обычно считается хорошим балансом между качеством и размером файла
    .audioBitrate("128k") // устанавливаем битрейт аудио
    .on("end", () => {
      res.send("ok");
      console.log("Все ок! Сжатие завершено.");
    })
    .on("error", (err) => {
      console.error("Error:", err);
    })
    .save(outputPath);
});
app.get("/test", postController.test);
io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("join", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });
  socket.on("private_message", (message) => {
    console.log(message, "message");
    io.to(message.receiverId).emit("new_private_message", message);
    // Сохраните ваше сообщение в базе данных здесь
    // Например: saveMessageToDb(message);
  });
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
