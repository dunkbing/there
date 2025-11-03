function Skeleton() {
  return (
    <main className="h-screen overflow-hidden bg-linear-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl opacity-20 animate-pulse" />
      </div>

      {/* Skeleton Header */}
      <div className="border-b bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-32 bg-muted/20 rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted/10 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Skeleton Content */}
      <div className="container mx-auto px-4 py-6 relative z-10 flex-1 min-h-0">
        <div className="grid lg:grid-cols-4 gap-6 h-full">
          <div className="lg:col-span-3">
            <div className="h-full bg-card/50 backdrop-blur-sm border rounded-lg animate-pulse" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="h-32 bg-card/50 backdrop-blur-sm border rounded-lg animate-pulse" />
            <div className="h-96 bg-card/50 backdrop-blur-sm border rounded-lg animate-pulse" />
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
        <div className="backdrop-blur-xl bg-white/10 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-full px-4 py-2 shadow-2xl flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary/60 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading room...</span>
        </div>
      </div>
    </main>
  );
}
export default Skeleton;
