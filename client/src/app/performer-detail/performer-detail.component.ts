import { Component, OnInit, Input, ViewChild, EventEmitter, Output } from '@angular/core';
import { Performer } from '../performer';
import { AlbumService } from '../shared/album/album.service';
import { Album, AlbumList } from '../album';
import { AlbumListComponent } from '../album-list/album-list.component';
import {Subscription, merge, of as observableOf} from 'rxjs';
import {catchError, map, startWith, switchMap, filter} from 'rxjs/operators';

@Component({
  selector: 'app-performer-detail',
  templateUrl: './performer-detail.component.html',
  styleUrls: ['./performer-detail.component.css']
})
export class PerformerDetailComponent implements OnInit {

  @Input() _performer: Performer;
  albums: Album[];

  resultsLength = 0;
  isLoadingResults = false;
  isRateLimitReached = false;

  pageSize = 10
  pageIndex = 0

  @ViewChild(AlbumListComponent) albumList: AlbumListComponent;
  
  performerChanged = new EventEmitter<any>();

  @Output()
  albumListChanged = new EventEmitter<any>();

  constructor(
    private albumService: AlbumService
  ) { }

  @Input() 
  set performer(performer: Performer) {
    this._performer = performer;
    this.albumList.paginator.pageIndex = 0;
    if (performer) {
      this.performerChanged.emit(null);
    }
  }

  ngOnInit() { }

  ngAfterViewInit(): any {
    merge(this.albumList.changed, this.performerChanged).pipe(
      startWith({}),
      filter(d => this._performer != null),
      switchMap(() => {
        this.isLoadingResults = true;
        return this.albumService.findByPerformer(
          this._performer, this.albumList.pageSize, this.albumList.pageIndex);
      }),
      map(data => {
        this.isLoadingResults = false;
        this.isRateLimitReached = false;
        this.resultsLength = data.page.totalElements;
        return data._embedded.albums;
      }),
      catchError((e) => {
        console.error('Error', e)
        this.isLoadingResults = false;
        this.isRateLimitReached = true;
        return observableOf([]);
      })
    ).subscribe(albums => {
      this.albums = albums      
    });

    this.albumList.deleteClicked.pipe(
      switchMap((album: Album) => {
        return this.albumService.remove(album);
      }),
      catchError((e) => {
        console.error('Error', e)
        return observableOf({});
      })
    ).subscribe((result) => {
      this.performerChanged.emit(null)
      this.albumListChanged.emit(null)
    })

  }
}
