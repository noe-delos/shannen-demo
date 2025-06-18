/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@iconify/react";
import { Plus, Search, Package, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Product } from "@/lib/types/database";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Protected product IDs that cannot be deleted
const PROTECTED_PRODUCTS = [
  "7719e3fe-2131-4ac7-8e80-01b4d9776f12",
  "97c80b6e-2420-4f97-9ae0-5e0ebd90fda0",
  "aa4ef3bd-b8e6-4199-ae63-7ac3c0962824",
  "c714524c-eed7-491d-8cc3-7e5372b077bb",
  "caa87373-8e92-4f0f-9cfc-2d9286b12a8b",
];

interface ProductForm {
  id?: string;
  name: string;
  price: string;
  marche: string;
  pitch: string;
  principales_objections_attendues: string;
}

export function ProductsGrid() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [formData, setFormData] = useState<ProductForm>({
    name: "",
    price: "",
    marche: "",
    pitch: "",
    principales_objections_attendues: "",
  });

  const supabase = createClient();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const filtered = products.filter(
      (product) =>
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.marche?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.pitch?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [products, searchTerm]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erreur lors du chargement des produits");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async () => {
    if (!formData.name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }

    try {
      setCreateLoading(true);
      const { data, error } = await supabase
        .from("products")
        .insert({
          name: formData.name,
          price: formData.price ? parseFloat(formData.price) : null,
          marche: formData.marche,
          pitch: formData.pitch,
          principales_objections_attendues:
            formData.principales_objections_attendues,
        })
        .select();

      if (error) throw error;

      toast.success("Produit créé avec succès");
      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        price: "",
        marche: "",
        pitch: "",
        principales_objections_attendues: "",
      });
      loadProducts();
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Erreur lors de la création du produit");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      id: product.id,
      name: product.name || "",
      price: product.price?.toString() || "",
      marche: product.marche || "",
      pitch: product.pitch || "",
      principales_objections_attendues:
        product.principales_objections_attendues || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !formData.name.trim()) {
      toast.error("Le nom du produit est requis");
      return;
    }

    try {
      setUpdateLoading(true);
      const { data, error } = await supabase
        .from("products")
        .update({
          name: formData.name,
          price: formData.price ? parseFloat(formData.price) : null,
          marche: formData.marche,
          pitch: formData.pitch,
          principales_objections_attendues:
            formData.principales_objections_attendues,
        })
        .eq("id", editingProduct.id)
        .select();

      if (error) throw error;

      toast.success("Produit mis à jour avec succès");
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      setFormData({
        name: "",
        price: "",
        marche: "",
        pitch: "",
        principales_objections_attendues: "",
      });
      loadProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Erreur lors de la mise à jour du produit");
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return;

    try {
      setDeleteLoading(true);
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deletingProduct.id);

      if (error) throw error;

      toast.success("Produit supprimé avec succès");

      // Close all dialogs
      setIsDeleteDialogOpen(false);
      setIsEditDialogOpen(false);
      setDeletingProduct(null);
      setEditingProduct(null);
      setFormData({
        name: "",
        price: "",
        marche: "",
        pitch: "",
        principales_objections_attendues: "",
      });

      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Erreur lors de la suppression du produit");
    } finally {
      setDeleteLoading(false);
    }
  };

  const isProtectedProduct = (productId: string) => {
    return PROTECTED_PRODUCTS.includes(productId);
  };

  const getMarcheColor = (marche: string) => {
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800",
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
    ];
    const hash = marche.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getMarcheEmoji = (marche: string) => {
    if (
      marche.toLowerCase().includes("pme") ||
      marche.toLowerCase().includes("startup")
    )
      return "🚀";
    if (
      marche.toLowerCase().includes("commerce") ||
      marche.toLowerCase().includes("digital")
    )
      return "🛒";
    if (
      marche.toLowerCase().includes("entreprise") ||
      marche.toLowerCase().includes("grande")
    )
      return "🏢";
    if (
      marche.toLowerCase().includes("saas") ||
      marche.toLowerCase().includes("service")
    )
      return "💻";
    return "📦";
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>

        {/* Search Skeleton */}
        <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>

        {/* Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de produits
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau produit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-name">Nom du produit</Label>
                  <Input
                    id="create-name"
                    placeholder="Ex: CRM Pro"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="create-price">Prix (€)</Label>
                  <Input
                    id="create-price"
                    type="number"
                    placeholder="299.99"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="create-marche">Marché cible</Label>
                <Input
                  id="create-marche"
                  placeholder="Ex: PME/Startups, E-commerce..."
                  value={formData.marche}
                  onChange={(e) =>
                    setFormData({ ...formData, marche: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="create-pitch">Pitch du produit</Label>
                <Textarea
                  id="create-pitch"
                  placeholder="Ex: Solution CRM complète pour optimiser votre relation client..."
                  rows={3}
                  value={formData.pitch}
                  onChange={(e) =>
                    setFormData({ ...formData, pitch: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="create-objections">
                  Principales objections attendues
                </Label>
                <Textarea
                  id="create-objections"
                  placeholder="Ex: Prix trop élevé, complexité, temps d'implémentation..."
                  rows={3}
                  value={formData.principales_objections_attendues}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      principales_objections_attendues: e.target.value,
                    })
                  }
                  className="mt-2"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateProduct}
                disabled={createLoading}
              >
                {createLoading ? "Création en cours..." : "Ajouter le produit"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingProduct && isProtectedProduct(editingProduct.id) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800 italic">
                  Ce produit par défaut ne peut pas être modifié
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Nom du produit</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: CRM Pro"
                  className="mt-2"
                  disabled={
                    !!(editingProduct && isProtectedProduct(editingProduct.id))
                  }
                />
              </div>
              <div>
                <Label htmlFor="edit-price">Prix (€)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="299.99"
                  className="mt-2"
                  disabled={
                    !!(editingProduct && isProtectedProduct(editingProduct.id))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-marche">Marché cible</Label>
              <Input
                id="edit-marche"
                value={formData.marche}
                onChange={(e) =>
                  setFormData({ ...formData, marche: e.target.value })
                }
                placeholder="Ex: PME/Startups, E-commerce..."
                className="mt-2"
                disabled={
                  !!(editingProduct && isProtectedProduct(editingProduct.id))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-pitch">Pitch du produit</Label>
              <Textarea
                id="edit-pitch"
                value={formData.pitch}
                onChange={(e) =>
                  setFormData({ ...formData, pitch: e.target.value })
                }
                placeholder="Ex: Solution CRM complète pour optimiser votre relation client..."
                rows={3}
                className="mt-2"
                disabled={
                  !!(editingProduct && isProtectedProduct(editingProduct.id))
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-objections">
                Principales objections attendues
              </Label>
              <Textarea
                id="edit-objections"
                value={formData.principales_objections_attendues}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    principales_objections_attendues: e.target.value,
                  })
                }
                placeholder="Ex: Prix trop élevé, complexité, temps d'implémentation..."
                rows={3}
                className="mt-2"
                disabled={
                  !!(editingProduct && isProtectedProduct(editingProduct.id))
                }
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingProduct(null);
                  setFormData({
                    name: "",
                    price: "",
                    marche: "",
                    pitch: "",
                    principales_objections_attendues: "",
                  });
                }}
              >
                {editingProduct && isProtectedProduct(editingProduct.id)
                  ? "Fermer"
                  : "Annuler"}
              </Button>
              {editingProduct && !isProtectedProduct(editingProduct.id) && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeletingProduct(editingProduct);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              )}
              {editingProduct && !isProtectedProduct(editingProduct.id) && (
                <Button
                  className="flex-1"
                  onClick={handleUpdateProduct}
                  disabled={updateLoading}
                >
                  {updateLoading ? "Modification en cours..." : "Mettre à jour"}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le produit</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Êtes-vous sûr de vouloir supprimer le produit "
                {deletingProduct?.name}" ?
              </p>
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-md">
                <p className="text-sm text-orange-800 font-medium">
                  ⚠️ Attention ! Si vous supprimez ce produit, les conversations
                  et feedbacks liés seront également supprimés.
                </p>
              </div>
              <p className="text-sm">Cette action est irréversible.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Suppression..." : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-[60%] "
        />
      </div>

      {/* Products Grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.1 }}
      >
        {filteredProducts.map((product) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            className="cursor-pointer"
            onClick={() => handleEditProduct(product)}
          >
            <Card className="hover:shadow-soft transition-shadow h-full shadow-soft py-2">
              <CardContent className="p-6 py-3">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <span className="text-2xl">
                          {getMarcheEmoji(product.marche || "")}
                        </span>
                      </div>
                      {isProtectedProduct(product.id) && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                          <Icon
                            icon="mdi:shield"
                            className="h-2.5 w-2.5 text-white"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getMarcheColor(product.marche || "")}>
                          {product.marche}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {product.pitch && (
                      <div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {product.pitch}
                        </p>
                      </div>
                    )}

                    {product.principales_objections_attendues && (
                      <div className="pt-2 border-t">
                        <h4 className="text-xs font-medium text-muted-foreground mb-1">
                          Objections courantes
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {product.principales_objections_attendues}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1">
                      <Icon
                        icon="material-symbols:package-2"
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="text-xs text-muted-foreground">
                        Produit
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {product.price && (
                        <span className="text-sm font-semibold text-green-600">
                          {product.price}€
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun produit trouvé</h3>
          <p className="text-muted-foreground">
            {searchTerm
              ? "Essayez de modifier votre recherche"
              : "Ajoutez votre premier produit pour commencer"}
          </p>
        </div>
      )}
    </div>
  );
}
