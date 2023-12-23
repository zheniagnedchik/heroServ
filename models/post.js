class Post {
  constructor(
    userId,
    prev,
    uri,
    description,
    contentType,
    type,
    userName,
    altUri,
    postName,
    typeTraining,
    approaches
  ) {
    this.userId = userId;
    this.prev = prev;
    this.uri = uri;
    this.comments = [];
    this.likes = [];
    this.date = new Date();
    this.description = description;
    this.contentType = contentType;
    this.type = type;
    this.userName = userName;
    this.altUri = altUri;
    this.postName = postName;
    this.typeTraining = typeTraining;
    this.approaches = approaches;
  }
}
module.exports = Post;
