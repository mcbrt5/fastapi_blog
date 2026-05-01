from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from posts import posts

app = FastAPI()

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/posts", response_class=HTMLResponse, include_in_schema=False)
def home():
    return f"<h1>{posts[0]["title"]}</h1>"

@app.get("/api/posts")
def get_posts():
    return posts