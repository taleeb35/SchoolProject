import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Save, Send, X } from "lucide-react";

interface WhatsAppHomeworkProps {
  classId: string;
  className: string;
  whatsappLink: string | null;
}

export function WhatsAppHomework({ classId, className, whatsappLink: initialLink }: WhatsAppHomeworkProps) {
  const [whatsappLink, setWhatsappLink] = useState(initialLink || "");
  const [homeworkText, setHomeworkText] = useState("");
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveLink = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("classes")
      .update({ whatsapp_group_link: whatsappLink })
      .eq("id", classId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save WhatsApp link",
      });
    } else {
      toast({
        title: "Success",
        description: "WhatsApp group link saved successfully",
      });
    }
    setSaving(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedImages(filesArray);
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendHomework = () => {
    if (!whatsappLink) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please set WhatsApp group link first",
      });
      return;
    }

    if (!homeworkText && selectedImages.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter homework text or select images",
      });
      return;
    }

    // Open WhatsApp group
    window.open(whatsappLink, '_blank');
    
    toast({
      title: "Opening WhatsApp Group",
      description: "Please paste your homework message and attach images manually in the group",
    });
    
    // Copy homework text to clipboard for easy pasting
    if (homeworkText) {
      let message = `*Homework for ${className}*\n\n${homeworkText}`;
      navigator.clipboard.writeText(message).then(() => {
        toast({
          title: "Text Copied",
          description: "Homework text copied to clipboard. Paste it in WhatsApp group",
        });
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          WhatsApp Homework
        </CardTitle>
        <CardDescription>
          Set WhatsApp group link. Text will be copied to clipboard and images need to be attached manually
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WhatsApp Group Link Section */}
        <div className="space-y-2">
          <Label htmlFor="whatsapp-link">WhatsApp Group Link</Label>
          <div className="flex gap-2">
            <Input
              id="whatsapp-link"
              placeholder="https://chat.whatsapp.com/..."
              value={whatsappLink}
              onChange={(e) => setWhatsappLink(e.target.value)}
            />
            <Button onClick={handleSaveLink} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get the group invite link from WhatsApp group info
          </p>
        </div>

        {whatsappLink && (
          <>
            <div className="border-t pt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="homework-text">Homework Message</Label>
                <Textarea
                  id="homework-text"
                  placeholder="Enter homework details or daily update..."
                  value={homeworkText}
                  onChange={(e) => setHomeworkText(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="homework-images">Attach Images (Optional)</Label>
                <Input
                  id="homework-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                />
                <p className="text-xs text-muted-foreground">
                  Note: You'll need to manually attach selected images in WhatsApp
                </p>
              </div>

              {selectedImages.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Images ({selectedImages.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="relative">
                        <div className="border rounded p-2 pr-8 text-sm">
                          {file.name}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute top-0 right-0 h-8 w-8"
                          onClick={() => handleRemoveImage(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSendHomework} className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Open WhatsApp & Copy Text
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
