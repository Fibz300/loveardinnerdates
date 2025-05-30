import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Eye, Video, MapPin, Zap, Crown } from "lucide-react";
import { Link } from "wouter";
import { User } from "@shared/schema";

interface HomeProps {
  user: User;
}

export default function Home({ user }: HomeProps) {
  const quickStats = [
    { icon: Heart, label: "Matches", value: "12", color: "text-red-500" },
    { icon: Eye, label: "Views", value: "48", color: "text-blue-500" },
    { icon: Video, label: "Calls", value: "3", color: "text-green-500" },
    { icon: MapPin, label: "Nearby", value: "25", color: "text-purple-500" },
  ];

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-pink-500 to-purple-600 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Welcome back, {user.firstName}!</CardTitle>
              <p className="text-pink-100 mt-2">
                Ready to find love in augmented reality?
              </p>
            </div>
            {user.isPremium && (
              <Badge className="bg-yellow-500 text-black">
                <Crown className="w-4 h-4 mr-1" />
                Premium
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <Icon className={`w-8 h-8 mx-auto mb-2 ${color}`} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-sm text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/discover">
            <Button className="w-full h-16 text-lg bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600">
              <Heart className="w-6 h-6 mr-2" />
              Start Swiping
            </Button>
          </Link>
          
          <Link href="/ar">
            <Button className="w-full h-16 text-lg bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
              <Eye className="w-6 h-6 mr-2" />
              AR View
            </Button>
          </Link>
          
          <Link href="/blind-date">
            <Button className="w-full h-16 text-lg bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600">
              <Zap className="w-6 h-6 mr-2" />
              Blind Date
            </Button>
          </Link>
          
          <Link href="/matches">
            <Button className="w-full h-16 text-lg bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600">
              <Video className="w-6 h-6 mr-2" />
              Video Calls
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Premium Features */}
      {!user.isPremium && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Crown className="w-5 h-5" />
              Upgrade to Premium
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-700 mb-4">
              Unlock unlimited swipes, advanced AR features, and priority matching!
            </p>
            <Link href="/wallet">
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                Upgrade Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Safety Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            <div className="text-sm text-blue-700">
              <strong>Safety Reminder:</strong> Never share personal phone numbers. 
              Use our secure video calling features for all communications. 
              Sharing contact information may result in account suspension and a $100 fine.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
