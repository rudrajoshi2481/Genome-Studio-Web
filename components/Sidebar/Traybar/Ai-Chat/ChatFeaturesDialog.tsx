import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, Globe, Plus } from "lucide-react"

interface ChatFeaturesDialogProps {
  children: React.ReactNode
}

function ChatFeaturesDialog({ children }: ChatFeaturesDialogProps) {
  const [databases, setDatabases] = useState({
    pubmed: true,
    uniprot: false,
    alphafold: false,
    pubchem: false,
    ncbi: true,
    geo: false,
    ensembl: false,
    reactome: false,
  })

  const [webSearch, setWebSearch] = useState(false)

  const [additionalFeatures, setAdditionalFeatures] = useState({
    codeGeneration: true,
    dataVisualization: false,
    workflowSuggestions: true,
    realTimeAnalysis: false,
  })

  const handleDatabaseToggle = (database: string) => {
    setDatabases((prev) => ({
      ...prev,
      [database]: !prev[database as keyof typeof prev],
    }))
  }

  const handleFeatureToggle = (feature: string) => {
    setAdditionalFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature as keyof typeof prev],
    }))
  }

  const databaseOptions = [
    { key: "pubmed", name: "PubMed", description: "Biomedical literature database", url: "https://pubmed.ncbi.nlm.nih.gov/favicon.ico" },
    { key: "uniprot", name: "UniProt", description: "Protein sequence and annotation", url: "https://www.uniprot.org/favicon.ico" },
    { key: "alphafold", name: "AlphaFold", description: "Protein structure predictions", url: "https://www.deepmind.com/favicon.ico" },
    { key: "pubchem", name: "PubChem", description: "Chemical information database", url: "https://pubchem.ncbi.nlm.nih.gov/favicon.ico" },
    { key: "ncbi", name: "NCBI", description: "National Center for Biotechnology Information", url: "https://www.ncbi.nlm.nih.gov/favicon.ico" },
    { key: "geo", name: "GEO", description: "Gene Expression Omnibus", url: "https://www.ncbi.nlm.nih.gov/favicon.ico" },
    { key: "ensembl", name: "Ensembl", description: "Genome annotation database", url: "https://useast.ensembl.org/favicon.ico" },
    { key: "reactome", name: "Reactome", description: "Pathway knowledge base", url: "https://reactome.org/favicon.ico" },
  ]

  const featureOptions = [
    { key: "codeGeneration", name: "Code Generation", description: "Generate analysis scripts and workflows" },
    { key: "dataVisualization", name: "Data Visualization", description: "Create charts and plots from data" },
    { key: "workflowSuggestions", name: "Workflow Suggestions", description: "Recommend analysis pipelines" },
    { key: "realTimeAnalysis", name: "Real-time Analysis", description: "Live data processing and monitoring" },
  ]

  const activeSources = Object.values(databases).filter(Boolean).length + (webSearch ? 1 : 0)
  const activeFeatures = Object.values(additionalFeatures).filter(Boolean).length

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="min-w-[70vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-green-500" />
            Chat Features & Data Sources
          </DialogTitle>
          <DialogDescription>
            Configure which databases and features the AI can access during conversations.
          </DialogDescription>
        </DialogHeader>
        

        <div className="space-y-8">
          {/* Database Sources */}
          <section>
            <h3 className="text-base font-semibold mb-2">Databases</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose which scientific databases the AI can query.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {databaseOptions.map((db) => {
                const active = databases[db.key as keyof typeof databases]
                return (
                  <div
                    key={db.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all
                      ${active ? "border-green-500 bg-green-50 shadow-sm" : "hover:border-muted-foreground/20 hover:shadow-sm"}`}
                  >
                    <div className="flex items-center gap-3">
                      <img src={db.url} alt={db.name} className="h-6 w-6 object-contain rounded border bg-white" />
                      <div>
                        <p className="font-medium text-sm">{db.name}</p>
                        <p className="text-xs text-muted-foreground">{db.description}</p>
                      </div>
                    </div>
                    <Switch
                      id={db.key}
                      checked={active}
                      onCheckedChange={() => handleDatabaseToggle(db.key)}
                      aria-label={`Toggle ${db.name}`}
                    />
                  </div>
                )
              })}
            </div>
          </section>

          <Separator />

          {/* Web Search */}
          <section>
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web Search
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Allow AI to search the web for additional information.
            </p>
            <div
              className={`flex items-center justify-between p-3 rounded-lg border transition-all
                ${webSearch ? "border-green-500 bg-green-50 shadow-sm" : "hover:border-muted-foreground/20 hover:shadow-sm"}`}
            >
              <div>
                <Label htmlFor="web-search" className="font-medium cursor-pointer">
                  Enable Web Search
                </Label>
                <p className="text-xs text-muted-foreground">
                  Search academic papers, docs, and recent research
                </p>
              </div>
              <Switch
                id="web-search"
                checked={webSearch}
                onCheckedChange={() => setWebSearch(!webSearch)}
                aria-label="Toggle web search"
              />
            </div>
          </section>

          <Separator />

          {/* Features */}
          <section>
            <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Additional Features
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enhance AI capabilities with extra tools.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {featureOptions.map((feature) => {
                const active = additionalFeatures[feature.key as keyof typeof additionalFeatures]
                return (
                  <div
                    key={feature.key}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all
                      ${active ? "border-green-500 bg-green-50 shadow-sm" : "hover:border-muted-foreground/20 hover:shadow-sm"}`}
                  >
                    <div>
                      <Label htmlFor={feature.key} className="font-medium cursor-pointer">
                        {feature.name}
                      </Label>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                    <Switch
                      id={feature.key}
                      checked={active}
                      onCheckedChange={() => handleFeatureToggle(feature.key)}
                      aria-label={`Toggle ${feature.name}`}
                    />
                  </div>
                )
              })}
            </div>
          </section>

          <Separator />

          {/* Summary */}
          <section className="flex items-center justify-between">
            <Badge variant="outline" className="text-xs px-2 py-1">
              {activeSources} Data Sources Active
            </Badge>
            <Badge variant="outline" className="text-xs px-2 py-1">
              {activeFeatures} Features Enabled
            </Badge>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ChatFeaturesDialog
