import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { 
  Heart, 
  Eye, 
  MessageCircle, 
  User, 
  Wallet, 
  Calendar,
  Settings,
  LogOut,
  Crown,
  Menu
} from "lucide-react";
import { User as UserType } from "@shared/schema";

interface NavigationProps {
  user: UserType;
  onLogout: () => void;
}

export default function Navigation({ user, onLogout }: NavigationProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: Heart, active: location === "/" },
    { href: "/discover", label: "Discover", icon: Heart, active: location === "/discover" },
    { href: "/ar", label: "AR View", icon: Eye, active: location === "/ar" },
    { href: "/matches", label: "Matches", icon: MessageCircle, active: location === "/matches" },
    { href: "/blind-date", label: "Blind Date", icon: Calendar, active: location === "/blind-date" },
  ];

  const userMenuItems = [
    { href: "/profile", label: "Profile", icon: User },
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <Heart className="w-8 h-8 text-pink-500" />
                  <Eye className="w-4 h-4 text-blue-500 absolute -top-1 -right-1" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  LoveAR
                </span>
              </div>
            </Link>

            {/* Navigation Items */}
            <div className="flex items-center gap-6">
              {navItems.map(({ href, label, icon: Icon, active }) => (
                <Link key={href} href={href}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {/* Wallet Balance */}
              <Link href="/wallet">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  ${user.walletBalance}
                </Button>
              </Link>

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {user.firstName[0]}{user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{user.firstName}</span>
                      {user.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                    {user.isPremium && (
                      <Badge className="mt-1 bg-yellow-500">Premium</Badge>
                    )}
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  {userMenuItems.map(({ href, label, icon: Icon }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href}>
                        <Icon className="w-4 h-4 mr-2" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={onLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {/* Mobile Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 h-16">
            <Link href="/">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Heart className="w-6 h-6 text-pink-500" />
                  <Eye className="w-3 h-3 text-blue-500 absolute -top-1 -right-1" />
                </div>
                <span className="text-lg font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                  LoveAR
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link href="/wallet">
                <Button variant="outline" size="sm">
                  ${user.walletBalance}
                </Button>
              </Link>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Mobile Menu Dropdown */}
          {isMobileMenuOpen && (
            <div className="border-t border-gray-200 bg-white">
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {user.firstName[0]}{user.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{user.firstName} {user.lastName}</div>
                    <div className="text-sm text-muted-foreground">@{user.username}</div>
                  </div>
                  {user.isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>

                <div className="space-y-2">
                  {[...navItems, ...userMenuItems].map(({ href, label, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {label}
                      </Button>
                    </Link>
                  ))}
                  
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-red-600"
                    onClick={() => {
                      onLogout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
          <div className="grid grid-cols-5 gap-1 p-2">
            {navItems.map(({ href, label, icon: Icon, active }) => (
              <Link key={href} href={href}>
                <Button
                  variant={active ? "default" : "ghost"}
                  size="sm"
                  className="flex flex-col gap-1 h-auto py-2 px-1"
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs">{label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
