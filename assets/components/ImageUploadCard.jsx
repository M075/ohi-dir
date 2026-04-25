import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, Edit2 } from "lucide-react";
import { useEffect, useState } from "react";

const ImageUploadCard = ({
  images,
  onChange,
  onRemoveImage,
  maxImages = 5,
}) => {
  const [previewImage, setPreviewImage] = useState(null);

  // Set initial preview if none selected
  useEffect(() => {
    if (!previewImage && images.length > 0) {
      setPreviewImage(images[0]);
    }
  }, [images, previewImage]);

  const handleThumbnailClick = (image) => {
    setPreviewImage(image);
  };

  const handleImageChange = (e, index = null) => {
    const files = Array.from(e.target.files);
    onChange("images", files, index);
  };

  const handleRemoveImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();

    const imageToRemove = images[index];

    // Track removed URL images
    if (typeof imageToRemove === "string") {
      onRemoveImage?.(imageToRemove);
    }

    // Find next available image for preview
    const isRemovingPreview = previewImage === images[index];
    if (isRemovingPreview) {
      const remainingImages = images.filter((_, i) => i !== index);
      setPreviewImage(remainingImages.length > 0 ? remainingImages[0] : null);
    }
    onChange("images", null, index, "remove");
  };

  return (
    <Card className="overflow-hidden" data-oid="avvc5ys">
      <CardHeader data-oid="9633:ke">
        <CardTitle data-oid="o3z2-bo">Product Images</CardTitle>
        <CardDescription data-oid="ef_u37k">
          Upload up to {maxImages} images of your product
        </CardDescription>
      </CardHeader>
      <CardContent data-oid="mk::ejy">
        <div className="grid gap-4" data-oid="_gf_.sv">
          {/* Main preview image */}
          {(previewImage || images[0]) && (
            <div className="relative" data-oid="0gch3mh">
              <img
                alt="Product preview"
                className="aspect-square w-full rounded-md object-cover"
                src={
                  previewImage
                    ? typeof previewImage === "string"
                      ? previewImage
                      : URL.createObjectURL(previewImage)
                    : typeof images[0] === "string"
                      ? images[0]
                      : URL.createObjectURL(images[0])
                }
                style={{ height: "300px", width: "300px" }}
                data-oid="ckz_.l."
              />

              {images.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={(e) =>
                    handleRemoveImage(e, images.indexOf(previewImage))
                  }
                  data-oid="_brk14o"
                >
                  <X className="h-4 w-4" data-oid="-q5-ibb" />
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-5" data-oid="5pze1nt">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative w-16 h-16 cursor-pointer"
                onClick={() => handleThumbnailClick(img)}
                data-oid="sq5hj59"
              >
                <img
                  alt={`Product image ${index + 1}`}
                  className="rounded-md object-cover w-full h-full"
                  src={typeof img === "string" ? img : URL.createObjectURL(img)}
                  data-oid="cl2fuxp"
                />

                <div
                  className="absolute top-1 right-1 flex gap-1"
                  data-oid="eyonatn"
                >
                  <Label
                    htmlFor={`change-image-${index}`}
                    className="cursor-pointer rounded-full bg-white p-1"
                    data-oid="dp:ss1_"
                  >
                    <Input
                      id={`change-image-${index}`}
                      type="file"
                      className="hidden"
                      onChange={(e) => handleImageChange(e, index)}
                      accept="image/*"
                      data-oid="ho4cqut"
                    />

                    <Edit2
                      className="h-3 w-3 text-gray-600"
                      data-oid="y16fli6"
                    />
                  </Label>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-5 w-5 rounded-full p-0"
                    onClick={(e) => handleRemoveImage(e, index)}
                    data-oid=":2o4ru1"
                  >
                    <X className="h-3 w-3" data-oid="r5:kbwa" />
                  </Button>
                </div>
              </div>
            ))}
            {images.length < maxImages && (
              <Label
                htmlFor="upload"
                className="flex w-16 h-16 hover:cursor-pointer items-center justify-center rounded-md border border-dashed"
                data-oid="az54-c1"
              >
                <Input
                  id="upload"
                  type="file"
                  className="hidden"
                  onChange={handleImageChange}
                  accept="image/*"
                  name="images"
                  multiple
                  data-oid="qm76j--"
                />

                <Upload
                  className="h-5 w-5 text-muted-foreground"
                  data-oid="ceogyhf"
                />
              </Label>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageUploadCard;
