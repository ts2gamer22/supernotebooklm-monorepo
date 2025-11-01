import NavigationHeader from "@/components/sections/navigation-header";
import HeroSection from "@/components/sections/hero-section";
import SearchBar from "@/components/sections/search-bar";
import FeaturedNotebooks from "@/components/sections/featured-notebooks";
import FeaturedUploads from "@/components/sections/featured-uploads";
import CategoryGrid from "@/components/sections/category-grid";
import MembersSection from "@/components/sections/members-section";
// import TrendingSection from "@/components/sections/trending-section";
import AdditionalCategories from "@/components/sections/additional-categories";

export default function Home() {
  // Updated: 2025-11-01 - Auto-deploy test
  return (
    <div className="min-h-screen bg-background text-foreground">
      <NavigationHeader />
      
      <main className="mx-auto max-w-6xl px-6 pt-24">
        <HeroSection />
        
        <SearchBar />
        
        <FeaturedNotebooks />
        
        <FeaturedUploads />
        
        <CategoryGrid />
        
        <div className="mt-10">
          <MembersSection />
        </div>
        
        {/* <div className="mt-10 mb-10">
          <TrendingSection />
        </div> */}
        
        <AdditionalCategories />
        
        <footer className="mt-20 pb-10 border-t border-border pt-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p className="font-mono">© 2024 Supernotebooklm</p>
            <nav className="flex gap-6">
              <a href="/about" className="hover:text-foreground transition-colors">About</a>
              <a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="/terms" className="hover:text-foreground transition-colors">Terms</a>
              <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  );
}