"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Search, RefreshCw } from "lucide-react";

const FileManager = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchFiles = async (pageToken = null) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        pageSize: 10,
        ...(pageToken && { pageToken }),
        ...(searchQuery && { query: searchQuery }),
      });

      const response = await fetch(`/api/list-files?${queryParams}`);

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();

      setFiles(pageToken ? [...files, ...data.files] : data.files);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (fileId) => {
    try {
      const response = await fetch("/api/files", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      // Remove file from state
      setFiles(files.filter((file) => file.id !== fileId));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [searchQuery]);

  return (
    <Card className="w-full max-w-4xl mx-auto" data-oid="hhg54xi">
      <CardHeader data-oid="7h.kqy-">
        <CardTitle
          className="flex justify-between items-center"
          data-oid="ss1pts-"
        >
          <span data-oid="qs4i18e">File Manager</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchFiles()}
            disabled={loading}
            data-oid="150zp_s"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              data-oid="bmhamtq"
            />
          </Button>
        </CardTitle>
        <div className="relative" data-oid="mt3ty.9">
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
            data-oid="hf4-3-_"
          />

          <Search
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
            data-oid="eh.kgq1"
          />
        </div>
      </CardHeader>

      <CardContent data-oid="i6u58yu">
        {error && (
          <div className="text-red-500 mb-4" data-oid="5pk:2uv">
            Error: {error}
          </div>
        )}

        <div className="space-y-4" data-oid="ma12:-q">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 border rounded-lg"
              data-oid="64of8k_"
            >
              <div className="flex-1" data-oid="qch8-63">
                <h3 className="font-medium" data-oid="xhx7v28">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500" data-oid="-.pt9tl">
                  {new Date(file.createdTime).toLocaleDateString()}
                  {file.size &&
                    ` • ${(parseInt(file.size) / 1024).toFixed(2)} KB`}
                </p>
              </div>
              <div className="flex gap-2" data-oid="5b77px4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(file.webContentLink, "_blank")}
                  data-oid="xe1l_:m"
                >
                  Download
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteFile(file.id)}
                  data-oid="69urtp4"
                >
                  <Trash2 className="h-4 w-4" data-oid=":8e5nlk" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {nextPageToken && (
          <div className="mt-4 text-center" data-oid="24xl69_">
            <Button
              variant="outline"
              onClick={() => fetchFiles(nextPageToken)}
              disabled={loading}
              data-oid=":q26_qw"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" data-oid="unb9.p:" />
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FileManager;
