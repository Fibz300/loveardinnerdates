import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Briefcase, GraduationCap, Heart, Crown, CheckCircle } from "lucide-react";
import { User } from "@shared/schema";

interface UserCardProps {
  user: User;
  showDistance?: boolean;
  distance?: number;
}

export default function UserCard({ user, showDistance = false, distance }: UserCardProps) {
  const calculateAge = (dateOfBirth: Date) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const age = calculateAge(user.dateOfBirth);

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden">
      {/* Profile Image Area */}
      <div className="relative h-96 bg-gradient-to-br from-pink-100 to-purple-100">
        <Avatar className="w-full h-full rounded-none">
          <AvatarImage src="" className="object-cover" />
          <AvatarFallback className="w-full h-full rounded-none text-6xl">
            {user.firstName[0]}{user.lastName[0]}
          </AvatarFallback>
        </Avatar>
        
        {/* Status badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          {user.isPremium && (
            <Badge className="bg-yellow-500 text-black">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
          {user.isVerified && (
            <Badge className="bg-blue-500">
              <CheckCircle className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
          {user.isActive && (
            <Badge className="bg-green-500">
              Online
            </Badge>
          )}
        </div>

        {/* Distance indicator */}
        {showDistance && distance && (
          <div className="absolute top-4 left-4">
            <Badge variant="secondary" className="bg-black/50 text-white">
              <MapPin className="w-3 h-3 mr-1" />
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${Math.round(distance)}km`} away
            </Badge>
          </div>
        )}

        {/* AR Tags floating */}
        {user.arTags && user.arTags.length > 0 && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {user.arTags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  className="bg-white/90 text-gray-800 backdrop-blur-sm"
                >
                  {tag}
                </Badge>
              ))}
              {user.arTags.length > 3 && (
                <Badge className="bg-white/90 text-gray-800 backdrop-blur-sm">
                  +{user.arTags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Profile Info */}
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Name and Age */}
          <div>
            <h3 className="text-xl font-bold">
              {user.firstName}, {age}
            </h3>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {user.bio}
            </p>
          )}

          {/* Details */}
          <div className="space-y-2">
            {user.occupation && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-gray-400" />
                <span>{user.occupation}</span>
              </div>
            )}

            {user.education && (
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span>{user.education}</span>
              </div>
            )}

            {user.height && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10l5-5 5 5M7 14l5 5 5-5" />
                </svg>
                <span>{user.height} cm</span>
              </div>
            )}
          </div>

          {/* Interests/Tags */}
          {user.arTags && user.arTags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Interests</h4>
              <div className="flex flex-wrap gap-1">
                {user.arTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Compatibility Score (if applicable) */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Heart className="w-4 h-4" />
              <span>Match Score</span>
            </div>
            <Badge variant="secondary" className="bg-pink-100 text-pink-800">
              {Math.floor(Math.random() * 30) + 70}%
            </Badge>
          </div>

          {/* Last Active */}
          <div className="text-xs text-gray-400 text-center">
            {user.isActive 
              ? "Active now" 
              : `Last seen ${user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "recently"}`
            }
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
