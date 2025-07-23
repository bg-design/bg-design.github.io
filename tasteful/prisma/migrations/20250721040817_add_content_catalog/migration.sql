-- CreateTable
CREATE TABLE "ContentCatalog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "author" TEXT,
    "year" TEXT,
    "imageUrl" TEXT,
    "snippet" TEXT,
    "articleUrl" TEXT,
    "spotifyUrl" TEXT,
    "youtubeUrl" TEXT,
    "amazonUrl" TEXT,
    "imdbUrl" TEXT,
    "trailerUrl" TEXT,
    "applePodcastsUrl" TEXT,
    "appUrl" TEXT,
    "source" TEXT,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCatalog_pkey" PRIMARY KEY ("id")
);
