import os
import urllib.request
import zipfile
import sys

URL = "https://dl.fbaipublicfiles.com/fasttext/vectors-english/wiki-news-300d-1M.vec.zip"
TARGET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "embeddings")
ZIP_PATH = os.path.join(TARGET_DIR, "fasttext.zip")
VEC_FILE = os.path.join(TARGET_DIR, "wiki-news-300d-1M.vec")

def download_progress(count, block_size, total_size):
    percent = int(count * block_size * 100 / total_size)
    sys.stdout.write(f"\rDownloading FastText embeddings... {percent}%")
    sys.stdout.flush()

def main():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)

    if not os.path.exists(VEC_FILE):
        print(f"Downloading FastText embeddings from {URL} (this may take a few minutes)...")
        urllib.request.urlretrieve(URL, ZIP_PATH, reporthook=download_progress)
        print("\nDownload complete. Extracting...")
        
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(TARGET_DIR)
            
        os.remove(ZIP_PATH)
        print("Extraction complete. FastText embeddings ready.")
    else:
        print("FastText embeddings already exist.")

if __name__ == "__main__":
    main()
