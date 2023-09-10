class Post {
  constructor(
    userId,
    prev,
    uri,
    description,
    contentType,
    type,
    userName,
    altUri
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
  }
}
module.exports = Post;
