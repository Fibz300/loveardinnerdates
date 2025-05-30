import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, Camera, Plus, X, Crown, MapPin } from "lucide-react";
import { User } from "@shared/schema";

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export default function Profile({ user, onUpdate }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    bio: user.bio || "",
    occupation: user.occupation || "",
    education: user.education || "",
    height: user.height?.toString() || "",
    maxDistance: user.maxDistance.toString(),
    ageMin: user.ageMin.toString(),
    ageMax: user.ageMax.toString(),
    arTags: user.arTags?.join(", ") || "",
  });

  const [mediaSlots] = useState([
    { id: 1, type: "photo", url: null },
    { id: 2, type: "video", url: null },
    { id: 3, type: "photo", url: null },
    { id: 4, type: "video", url: null },
    { id: 5, type: "photo", url: null },
    { id: 6, type: "video", url: null },
    { id: 7, type: "photo", url: null },
    { id: 8, type: "video", url: null },
  ]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const updates = {
        ...formData,
        height: formData.height ? parseInt(formData.height) : null,
        maxDistance: parseInt(formData.maxDistance),
        ageMin: parseInt(formData.ageMin),
        ageMax: parseInt(formData.ageMax),
        arTags: formData.arTags.split(",").map(tag => tag.trim()).filter(Boolean),
      };

      const response = await apiRequest("PUT", `/api/users/${user.id}`, updates);
      const updatedUser = await response.json();
      
      onUpdate(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setIsEditing(false);
      
      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src="" />
                <AvatarFallback className="text-lg">
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {user.firstName} {user.lastName}
                  {user.isPremium && <Crown className="w-5 h-5 text-yellow-500" />}
                  {user.isVerified && <Badge variant="secondary">Verified</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  {user.latitude && user.longitude ? "Location enabled" : "Enable location"}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Settings className="w-4 h-4 mr-2" />
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Media Slots */}
      <Card>
        <CardHeader>
          <CardTitle>Photos & Videos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add up to 4 photos and 4 videos to showcase yourself
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mediaSlots.map((slot) => (
              <div
                key={slot.id}
                className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary cursor-pointer transition-colors"
              >
                {slot.url ? (
                  <div className="relative w-full h-full">
                    {slot.type === "photo" ? (
                      <img src={slot.url} alt="" className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <video src={slot.url} className="w-full h-full object-cover rounded-lg" />
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2 w-6 h-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="text-xs text-gray-500">
                      {slot.type === "photo" ? "Add Photo" : "Add Video"}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => setFormData(prev => ({ ...prev, height: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="arTags">AR Tags (comma separated)</Label>
                <Input
                  id="arTags"
                  placeholder="Funny, Adventurous, Coffee Lover"
                  value={formData.arTags}
                  onChange={(e) => setFormData(prev => ({ ...prev, arTags: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  These tags will appear above your head in AR view
                </p>
              </div>

              <div className="space-y-2">
                <Label>Discovery Preferences</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxDistance" className="text-sm">Max Distance (km)</Label>
                    <Input
                      id="maxDistance"
                      type="number"
                      value={formData.maxDistance}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxDistance: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ageMin" className="text-sm">Min Age</Label>
                    <Input
                      id="ageMin"
                      type="number"
                      value={formData.ageMin}
                      onChange={(e) => setFormData(prev => ({ ...prev, ageMin: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ageMax" className="text-sm">Max Age</Label>
                    <Input
                      id="ageMax"
                      type="number"
                      value={formData.ageMax}
                      onChange={(e) => setFormData(prev => ({ ...prev, ageMax: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label className="text-sm font-medium">Bio</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {user.bio || "No bio added yet"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Occupation</Label>
                  <p className="text-sm text-muted-foreground">
                    {user.occupation || "Not specified"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Height</Label>
                  <p className="text-sm text-muted-foreground">
                    {user.height ? `${user.height} cm` : "Not specified"}
                  </p>
                </div>
              </div>

              {user.arTags && user.arTags.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">AR Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {user.arTags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium">Discovery Settings</Label>
                <p className="text-sm text-muted-foreground">
                  Within {user.maxDistance}km • Ages {user.ageMin}-{user.ageMax}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">Premium Status</span>
            <Badge variant={user.isPremium ? "default" : "secondary"}>
              {user.isPremium ? "Premium" : "Free"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Verification</span>
            <Badge variant={user.isVerified ? "default" : "secondary"}>
              {user.isVerified ? "Verified" : "Unverified"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Wallet Balance</span>
            <span className="text-sm font-medium">${user.walletBalance}</span>
          </div>
          {user.suspendedUntil && user.suspendedUntil > new Date() && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Account suspended until {user.suspendedUntil.toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
