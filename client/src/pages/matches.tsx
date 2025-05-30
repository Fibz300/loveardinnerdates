import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MessageCircle, Video, Heart, Calendar, Crown } from "lucide-react";
import { User, Match } from "@shared/schema";

interface MatchesProps {
  user: User;
}

interface MatchWithUser extends Match {
  otherUser: User;
  lastMessage?: {
    content: string;
    sentAt: Date;
    isRead: boolean;
  };
}

export default function Matches({ user }: MatchesProps) {
  const [selectedTab, setSelectedTab] = useState<"matches" | "likes">("matches");

  // Fetch user's matches
  const { data: matches = [], isLoading } = useQuery<MatchWithUser[]>({
    queryKey: ["/api/matches", user.id],
  });

  const recentMatches = matches.filter(match => {
    const daysSinceMatch = (Date.now() - new Date(match.matchedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceMatch <= 7;
  });

  const olderMatches = matches.filter(match => {
    const daysSinceMatch = (Date.now() - new Date(match.matchedAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceMatch > 7;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Your Matches</h1>
        <p className="text-muted-foreground">
          {matches.length} {matches.length === 1 ? "match" : "matches"}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={selectedTab === "matches" ? "default" : "outline"}
          onClick={() => setSelectedTab("matches")}
          className="flex-1"
        >
          <Heart className="w-4 h-4 mr-2" />
          Matches ({matches.length})
        </Button>
        <Button
          variant={selectedTab === "likes" ? "default" : "outline"}
          onClick={() => setSelectedTab("likes")}
          className="flex-1"
          disabled={!user.isPremium}
        >
          {!user.isPremium && <Crown className="w-4 h-4 mr-2" />}
          Likes You {!user.isPremium && "(Premium)"}
        </Button>
      </div>

      {/* Content */}
      {selectedTab === "matches" ? (
        <div className="space-y-6">
          {matches.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No matches yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start swiping to find your perfect match!
                </p>
                <Link href="/discover">
                  <Button>Start Swiping</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Recent Matches */}
              {recentMatches.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Recent Matches
                  </h2>
                  <div className="space-y-3">
                    {recentMatches.map((match) => (
                      <MatchCard key={match.id} match={match} currentUser={user} />
                    ))}
                  </div>
                </div>
              )}

              {/* Older Matches */}
              {olderMatches.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">All Matches</h2>
                  <div className="space-y-3">
                    {olderMatches.map((match) => (
                      <MatchCard key={match.id} match={match} currentUser={user} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
            <p className="text-muted-foreground mb-4">
              See who likes you before you swipe! Upgrade to premium to unlock this feature.
            </p>
            <Link href="/wallet">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                Upgrade to Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MatchCard({ match, currentUser }: { match: MatchWithUser; currentUser: User }) {
  const otherUser = match.otherUser;
  const daysSinceMatch = Math.floor((Date.now() - new Date(match.matchedAt).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src="" />
            <AvatarFallback className="text-lg">
              {otherUser.firstName[0]}{otherUser.lastName[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{otherUser.firstName}</h3>
              {otherUser.isVerified && <Badge variant="secondary">Verified</Badge>}
              {otherUser.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            
            <p className="text-sm text-muted-foreground mb-1">
              {otherUser.occupation || "No occupation listed"}
            </p>
            
            {match.lastMessage ? (
              <p className="text-sm text-muted-foreground truncate">
                {match.lastMessage.content}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Matched {daysSinceMatch === 0 ? "today" : `${daysSinceMatch} days ago`}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Link href={`/messages/${match.id}`}>
              <Button size="sm" variant="outline" className="w-full">
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat
              </Button>
            </Link>
            
            {currentUser.isPremium && (
              <Link href={`/video-call/${match.id}`}>
                <Button size="sm" className="w-full">
                  <Video className="w-4 h-4 mr-1" />
                  Video
                </Button>
              </Link>
            )}
          </div>
        </div>

        {match.lastMessage && !match.lastMessage.isRead && (
          <div className="w-2 h-2 bg-blue-500 rounded-full absolute top-4 right-4"></div>
        )}
      </CardContent>
    </Card>
  );
}
