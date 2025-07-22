import json
import os
import sys
from typing import List, Dict, Set, Optional
from dataclasses import dataclass


@dataclass
class Person:
    """Represents a person in the organizational chart"""
    id: int
    name: str
    position: str
    parent_ids: List[int]


class OrgChartManager:
    """Manager class for organizational chart operations"""
    
    def __init__(self, data_file: str = "data/orgchart.json"):
        self.data_file = data_file
        self.people: List[Person] = []
        self.errors: List[str] = []
    
    def load_data(self) -> bool:
        """Load data from JSON file"""
        try:
            if not os.path.exists(self.data_file):
                print(f"Warning: {self.data_file} does not exist")
                return False
            
            with open(self.data_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            self.people = []
            for item in data:
                person = Person(
                    id=item['id'],
                    name=item['name'],
                    position=item['position'],
                    parent_ids=item.get('parentIds', [])
                )
                self.people.append(person)
            
            print(f"Loaded {len(self.people)} people from {self.data_file}")
            return True
            
        except Exception as e:
            print(f"Error loading data: {e}")
            return False
    
    def save_data(self) -> bool:
        """Save data to JSON file"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.data_file), exist_ok=True)
            
            # Convert to JSON format
            data = []
            for person in self.people:
                data.append({
                    "id": person.id,
                    "name": person.name,
                    "position": person.position,
                    "parentIds": person.parent_ids
                })
            
            # Sort by ID for consistency
            data.sort(key=lambda x: x['id'])
            
            with open(self.data_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            print(f"Saved {len(self.people)} people to {self.data_file}")
            return True
            
        except Exception as e:
            print(f"Error saving data: {e}")
            return False
    
    def validate(self) -> bool:
        """Validate the organizational chart data"""
        self.errors = []
        
        if not self.people:
            self.errors.append("No people data loaded")
            return False
        
        # Check for duplicate IDs
        ids = [person.id for person in self.people]
        if len(ids) != len(set(ids)):
            self.errors.append("Duplicate IDs found")
        
        # Check for invalid parent references
        valid_ids = set(ids)
        for person in self.people:
            for parent_id in person.parent_ids:
                if parent_id not in valid_ids:
                    self.errors.append(f"Person {person.name} (ID: {person.id}) references invalid parent ID: {parent_id}")
        
        # Check for circular references
        if self._has_circular_references():
            self.errors.append("Circular references detected in hierarchy")
        
        # Check for orphaned nodes (except roots)
        roots = self._find_roots()
        if not roots:
            self.errors.append("No root nodes found (people with no parents)")
        
        # Check for unreachable nodes
        reachable = self._find_reachable_nodes()
        for person in self.people:
            if person.id not in reachable:
                self.errors.append(f"Person {person.name} (ID: {person.id}) is not reachable from any root")
        
        if self.errors:
            print("Validation errors found:")
            for error in self.errors:
                print(f"  - {error}")
            return False
        
        print("Validation successful: No errors found")
        return True
    
    def _has_circular_references(self) -> bool:
        """Check for circular references in the hierarchy"""
        visited = set()
        recursion_stack = set()
        
        def dfs(person_id: int) -> bool:
            if person_id in recursion_stack:
                return True  # Cycle detected
            
            if person_id in visited:
                return False
            
            visited.add(person_id)
            recursion_stack.add(person_id)
            
            person = next((p for p in self.people if p.id == person_id), None)
            if person:
                for parent_id in person.parent_ids:
                    if dfs(parent_id):
                        return True
            
            recursion_stack.remove(person_id)
            return False
        
        for person in self.people:
            if person.id not in visited:
                if dfs(person.id):
                    return True
        
        return False
    
    def _find_roots(self) -> List[Person]:
        """Find root nodes (people with no parents)"""
        return [person for person in self.people if not person.parent_ids]
    
    def _find_reachable_nodes(self) -> Set[int]:
        """Find all nodes reachable from root nodes"""
        roots = self._find_roots()
        reachable = set()
        
        def dfs(person_id: int):
            if person_id in reachable:
                return
            
            reachable.add(person_id)
            
            # Find children
            for person in self.people:
                if person_id in person.parent_ids:
                    dfs(person.id)
        
        for root in roots:
            dfs(root.id)
        
        return reachable
    
    def print_hierarchy(self, person_id: Optional[int] = None, level: int = 0, visited: Optional[Set[int]] = None):
        """Print the hierarchy starting from a person (or all roots)"""
        if visited is None:
            visited = set()
        
        if person_id is None:
            # Print all root nodes
            roots = self._find_roots()
            print("Organizational Hierarchy:")
            print("=" * 40)
            for root in roots:
                self.print_hierarchy(root.id, 0, set())
                print()
        else:
            if person_id in visited:
                print("  " * level + f"[CIRCULAR REFERENCE: {person_id}]")
                return
            
            visited.add(person_id)
            person = next((p for p in self.people if p.id == person_id), None)
            
            if person:
                indent = "  " * level
                print(f"{indent}{person.name} ({person.position})")
                
                # Find children
                children = [p for p in self.people if person_id in p.parent_ids]
                for child in children:
                    self.print_hierarchy(child.id, level + 1, visited.copy())
    
    def get_statistics(self) -> Dict:
        """Get statistics about the organizational chart"""
        if not self.people:
            return {}
        
        # Count by position
        position_counts = {}
        for person in self.people:
            position_counts[person.position] = position_counts.get(person.position, 0) + 1
        
        # Count levels
        level_counts = {}
        for person in self.people:
            level = self._calculate_level(person.id)
            level_counts[level] = level_counts.get(level, 0) + 1
        
        # Find largest teams
        team_sizes = {}
        for person in self.people:
            children_count = len([p for p in self.people if person.id in p.parent_ids])
            if children_count > 0:
                team_sizes[person.name] = children_count
        
        return {
            "total_people": len(self.people),
            "total_positions": len(position_counts),
            "position_distribution": position_counts,
            "level_distribution": level_counts,
            "largest_teams": dict(sorted(team_sizes.items(), key=lambda x: x[1], reverse=True)[:5]),
            "root_count": len(self._find_roots())
        }
    
    def _calculate_level(self, person_id: int, visited: Optional[Set[int]] = None) -> int:
        """Calculate the level of a person in the hierarchy"""
        if visited is None:
            visited = set()
        
        if person_id in visited:
            return 0  # Avoid infinite loops
        
        visited.add(person_id)
        person = next((p for p in self.people if p.id == person_id), None)
        
        if not person or not person.parent_ids:
            return 0  # Root level
        
        # Find minimum level among parents
        parent_levels = [self._calculate_level(pid, visited.copy()) for pid in person.parent_ids]
        return min(parent_levels) + 1 if parent_levels else 0
    
    def add_person(self, name: str, position: str, parent_ids: List[int] = None) -> int:
        """Add a new person to the organization"""
        if parent_ids is None:
            parent_ids = []
        
        # Find next available ID
        existing_ids = [person.id for person in self.people]
        new_id = max(existing_ids) + 1 if existing_ids else 1
        
        new_person = Person(
            id=new_id,
            name=name,
            position=position,
            parent_ids=parent_ids
        )
        
        self.people.append(new_person)
        print(f"Added: {name} ({position}) with ID {new_id}")
        return new_id
    
    def remove_person(self, person_id: int) -> bool:
        """Remove a person from the organization"""
        person = next((p for p in self.people if p.id == person_id), None)
        if not person:
            print(f"Person with ID {person_id} not found")
            return False
        
        # Remove from parent references
        for p in self.people:
            if person_id in p.parent_ids:
                p.parent_ids.remove(person_id)
        
        # Remove the person
        self.people.remove(person)
        print(f"Removed: {person.name}")
        return True
    
    def update_person(self, person_id: int, name: str = None, position: str = None, parent_ids: List[int] = None):
        """Update a person's information"""
        person = next((p for p in self.people if p.id == person_id), None)
        if not person:
            print(f"Person with ID {person_id} not found")
            return False
        
        if name is not None:
            person.name = name
        if position is not None:
            person.position = position
        if parent_ids is not None:
            person.parent_ids = parent_ids
        
        print(f"Updated: {person.name}")
        return True


def main():
    """Main function for command-line usage"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Orgchart Management Utilities")
    parser.add_argument("--file", default="data/orgchart.json", help="Path to orgchart JSON file")
    parser.add_argument("--validate", action="store_true", help="Validate the orgchart data")
    parser.add_argument("--stats", action="store_true", help="Show statistics")
    parser.add_argument("--hierarchy", action="store_true", help="Print hierarchy")
    parser.add_argument("--create-sample", action="store_true", help="Create sample orgchart file")
    
    args = parser.parse_args()
    
    manager = OrgChartManager(args.file)
    
    if args.create_sample:
        # Create sample data matching the provided structure
        sample_data = [
            {"id": 1, "name": "Michael Decker", "position": "CEO", "parentIds": []},
            {"id": 2, "name": "Jamie Rohner", "position": "Projektleitung", "parentIds": [1]},
            {"id": 3, "name": "Fabian \"Evolution\"", "position": "Projektleitung", "parentIds": [1]},
            {"id": 4, "name": "Philipp", "position": "Projektleitung", "parentIds": [1]},
            {"id": 5, "name": "Roskato", "position": "Projektleitung", "parentIds": [1]},
            {"id": 6, "name": "TBD", "position": "Projektleitung", "parentIds": [1]},
            {"id": 7, "name": "Marvin", "position": "Mediengestalter", "parentIds": [5]},
            {"id": 8, "name": "Paul", "position": "Social Media Manager", "parentIds": [5]},
            {"id": 9, "name": "Marcel", "position": "Social Media Manager", "parentIds": [5]},
            {"id": 10, "name": "Eric", "position": "Club Leitung", "parentIds": [6]},
            {"id": 11, "name": "Mini", "position": "Club Leitung", "parentIds": [6]},
            {"id": 12, "name": "Mella", "position": "Club Leitung", "parentIds": [6]},
            {"id": 13, "name": "Phyn", "position": "Team Akquise", "parentIds": [2]},
            {"id": 14, "name": "Sechseck", "position": "Team Akquise", "parentIds": [2]},
            {"id": 15, "name": "Dominik", "position": "Bereichsleitung R6", "parentIds": [16]},
            {"id": 16, "name": "Felix", "position": "Bereichsleitung R6", "parentIds": [10, 11, 12]},
            {"id": 17, "name": "Ferrit", "position": "Social Media Manager", "parentIds": [5]},
            {"id": 18, "name": "Luca", "position": "Bereichsleitung Rocket League", "parentIds": [10, 11, 12]},
            {"id": 19, "name": "Mario", "position": "Bereichsleitung Rocket League", "parentIds": [18]},
            {"id": 20, "name": "Lunarell", "position": "Head of Content Creation", "parentIds": [5]},
            {"id": 21, "name": "NYC_1809", "position": "Bereichsleitung Valorant", "parentIds": [10, 11, 12]},
            {"id": 22, "name": "OsirisGCC", "position": "Bereichsleitung R6", "parentIds": [16]},
            {"id": 23, "name": "RagzyEntropy", "position": "Bereichsleitung R6", "parentIds": [16]},
            {"id": 24, "name": "Salva", "position": "Head of eSports", "parentIds": [3]},
            {"id": 25, "name": "Zain", "position": "Eventmanagement", "parentIds": [10, 11, 12]}
        ]
        
        os.makedirs(os.path.dirname(args.file), exist_ok=True)
        with open(args.file, 'w', encoding='utf-8') as f:
            json.dump(sample_data, f, indent=2, ensure_ascii=False)
        
        print(f"Created sample orgchart at {args.file}")
        return
    
    if not manager.load_data():
        print("Failed to load data. Use --create-sample to create a sample file.")
        return
    
    if args.validate:
        manager.validate()
    
    if args.stats:
        stats = manager.get_statistics()
        print("\nOrganizational Chart Statistics:")
        print("=" * 40)
        for key, value in stats.items():
            if isinstance(value, dict):
                print(f"{key.replace('_', ' ').title()}:")
                for k, v in value.items():
                    print(f"  {k}: {v}")
            else:
                print(f"{key.replace('_', ' ').title()}: {value}")
    
    if args.hierarchy:
        manager.print_hierarchy()


if __name__ == "__main__":
    main()